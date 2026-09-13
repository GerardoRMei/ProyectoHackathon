"""
API del Copiloto de Salud Financiera
Entropy Hack - Bancoagrícola

Sirve el modelo XGBoost entrenado y, ademas, hace de puente ("bridge") hacia
el LLM (Gemini) que sostiene la conversacion con el cliente. El flujo es:

    1) El frontend manda los datos del usuario a /chat/iniciar
    2) Corremos el modelo -> score_riesgo + features
    3) Con eso armamos el contexto_riesgo (copiloto_llm.construir_contexto_riesgo)
       y abrimos una Sesion nueva
    4) Le pedimos al LLM el primer turno (el chatbot abre la conversacion)
    5) El frontend manda cada respuesta del cliente a /chat/mensaje junto
       con el sesion_id que le devolvimos

Para correr localmente:
    pip install fastapi uvicorn joblib pandas xgboost google-genai --break-system-packages
    uvicorn api:app --reload --port 8000

Luego abrir http://localhost:8000/docs para probarlo interactivamente.
"""

import uuid
from typing import Dict
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import pandas as pd

from services.Copiloto import Sesion, turno, construir_contexto_riesgo, describir_horario_habil
from services.registro import inicializar_db, obtener_registros, obtener_metricas
from services.voiceGeneration import generar_audio_base64
from services.Personas import PERSONAS_DEMO

inicializar_db()

load_dotenv()
app = FastAPI(title="Copiloto de Salud Financiera - API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # para el hackathon está bien abierto así
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Cargamos el modelo UNA sola vez al arrancar el servidor (no en cada request,
# eso sería lentísimo)
modelo = joblib.load("C:\\Users\\gerad\\Documents\\ProyectoHackathon\\backend\\services\\xgb_model.joblib")

# Umbral de riesgo a partir del cual activamos el mensaje del Copiloto.
UMBRAL_RIESGO = 0.5

# Sesiones de chat activas. Un dict en memoria alcanza para la demo del
# hackathon -- si el proceso se reinicia se pierden, pero no hace falta
# persistencia real para esto.
_sesiones: Dict[str, Sesion] = {}


class DatosUsuario(BaseModel):
    persona_id: str | None = Field(
        default=None,
        description="Id de la persona demo elegida en el selector (sofia, sebastian, ricardo, jorge, rodrigo). No se usa para el modelo.",
    )
    RevolvingUtilizationOfUnsecuredLines: float = Field(..., example=0.3)
    age: int = Field(..., example=35)
    numero_atrasos_30_59: int = Field(..., example=0, alias="NumberOfTime30-59DaysPastDueNotWorse")
    DebtRatio: float = Field(..., example=0.25)
    MonthlyIncome: float = Field(..., example=2500)
    NumberOfOpenCreditLinesAndLoans: int = Field(..., example=5)
    NumberOfTimes90DaysLate: int = Field(..., example=0)
    NumberRealEstateLoansOrLines: int = Field(..., example=1)
    numero_atrasos_60_89: int = Field(..., example=0, alias="NumberOfTime60-89DaysPastDueNotWorse")
    NumberOfDependents: int = Field(..., example=2)

    class Config:
        populate_by_name = True


def construir_features(datos: DatosUsuario) -> pd.DataFrame:
    """Recrea EXACTAMENTE las mismas columnas derivadas que usamos en el
    pipeline de entrenamiento. Si esto no coincide 1:1 con pipeline.py,
    el modelo va a fallar o dar predicciones sin sentido."""
    fila = {
        "RevolvingUtilizationOfUnsecuredLines": datos.RevolvingUtilizationOfUnsecuredLines,
        "age": datos.age,
        "NumberOfTime30-59DaysPastDueNotWorse": datos.numero_atrasos_30_59,
        "DebtRatio": datos.DebtRatio,
        "MonthlyIncome": datos.MonthlyIncome,
        "NumberOfOpenCreditLinesAndLoans": datos.NumberOfOpenCreditLinesAndLoans,
        "NumberOfTimes90DaysLate": datos.NumberOfTimes90DaysLate,
        "NumberRealEstateLoansOrLines": datos.NumberRealEstateLoansOrLines,
        "NumberOfTime60-89DaysPastDueNotWorse": datos.numero_atrasos_60_89,
        "NumberOfDependents": datos.NumberOfDependents,
        "MonthlyIncome_was_missing": 0,
    }
    fila["TotalPastDue"] = (
        fila["NumberOfTime30-59DaysPastDueNotWorse"]
        + fila["NumberOfTime60-89DaysPastDueNotWorse"]
        + fila["NumberOfTimes90DaysLate"]
    )
    fila["IncomePerDependent"] = fila["MonthlyIncome"] / (fila["NumberOfDependents"] + 1)
    fila["CreditLinesPerAge"] = fila["NumberOfOpenCreditLinesAndLoans"] / fila["age"]
    fila["HighUtilizationFlag"] = int(fila["RevolvingUtilizationOfUnsecuredLines"] > 0.8)

    return pd.DataFrame([fila])


def _correr_modelo(datos: DatosUsuario):
    """Punto unico donde corremos XGBoost. Lo usan tanto /predecir (para
    debug/pruebas rapidas sin LLM) como /chat/iniciar (que si dispara el
    copiloto)."""
    X = construir_features(datos)

    columnas_esperadas = modelo.get_booster().feature_names
    for col in columnas_esperadas:
        if col not in X.columns:
            X[col] = 0
    X = X[columnas_esperadas]

    score = float(modelo.predict_proba(X)[0, 1])
    resultado_modelo = {
        "score_riesgo": round(score, 4),
        "en_riesgo": score >= UMBRAL_RIESGO,
    }
    features = X.iloc[0].to_dict()
    return resultado_modelo, features


@app.post("/predecir")
def predecir(datos: DatosUsuario):
    """Endpoint 'crudo': solo el score del modelo, sin tocar al LLM."""
    resultado_modelo, _ = _correr_modelo(datos)
    return resultado_modelo


class MensajeChat(BaseModel):
    sesion_id: str
    mensaje: str


@app.post("/chat/iniciar")
async def iniciar_chat(datos: DatosUsuario):
    """Corre el modelo, arma el contexto de riesgo y abre una sesion nueva
    de chat. Devuelve el sesion_id (el frontend debe guardarlo y mandarlo
    en cada /chat/mensaje) y el primer turno del copiloto."""
    resultado_modelo, features = _correr_modelo(datos)
    datos_usuario = datos.model_dump(by_alias=False)

    contexto = construir_contexto_riesgo(resultado_modelo, datos_usuario, features)
    contexto = f"{contexto}\n\n{describir_horario_habil()}"

    persona = PERSONAS_DEMO.get(datos.persona_id) if datos.persona_id else None

    sesion_id = str(uuid.uuid4())
    sesion = Sesion(
        contexto_riesgo=contexto,
        sesion_id=sesion_id,
        score_riesgo=resultado_modelo["score_riesgo"],
        persona_id=datos.persona_id,
        estado_llamada=persona["estado_inicial"] if persona else None,
    )
    _sesiones[sesion_id] = sesion

    resultado_turno = turno(sesion, None)
    audio_b64 = await generar_audio_base64(resultado_turno["texto"])
    return {"sesion_id": sesion_id, **resultado_modelo, **resultado_turno, "audio_base64": audio_b64}


@app.post("/chat/mensaje")
async def enviar_mensaje(payload: MensajeChat):
    """El cliente respondio algo en el chat -- le pasamos el mensaje al
    copiloto y devolvemos su siguiente turno."""
    sesion = _sesiones.get(payload.sesion_id)
    if sesion is None:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")
    if sesion.resultado_registrado is not None:
        raise HTTPException(status_code=400, detail="Esta conversacion ya fue cerrada")

    resultado_turno = turno(sesion, payload.mensaje)
    audio_b64 = await generar_audio_base64(resultado_turno["texto"])
    return {**resultado_turno, "audio_base64": audio_b64}


@app.get("/chat/{sesion_id}/resultado")
def obtener_resultado(sesion_id: str):
    """Para que el dashboard consulte si la conversacion ya cerro y con
    que resultado (llenado por la tool registrar_resultado)."""
    sesion = _sesiones.get(sesion_id)
    if sesion is None:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")
    return {
        "cerrada": sesion.resultado_registrado is not None,
        "resultado": sesion.resultado_registrado,
    }


@app.get("/")
def health_check():
    return {"status": "ok", "modelo": "xgboost", "umbral": UMBRAL_RIESGO}


@app.get("/dashboard/registros")
def listar_registros():
    return obtener_registros()


@app.get("/dashboard/metricas")
def metricas():
    return obtener_metricas()