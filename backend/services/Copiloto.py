import os
import time
from dataclasses import dataclass, field
from .registro import guardar_registro
from .Personas import PERSONAS_DEMO, REGLAS_PERFIL_CLIENTE, REGLAS_ESTADO_LLAMADA
from .contexto_riesgo import construir_contexto_riesgo, describir_horario_habil  # noqa: F401  (re-exportado para main.py)
from .prompts import SYSTEM_PROMPT_BASE
from .herramientas import TOOLS
from google import genai
from google.genai import errors as genai_errors
from google.genai import types


@dataclass
class Sesion:
    contexto_riesgo: str
    sesion_id: str = ""
    score_riesgo: float | None = None
    historial: list = field(default_factory=list)
    resultado_registrado: dict | None = None
    propuesta_reestructuracion: dict | None = None
    contador_simulado: int = 0
    persona_id: str | None = None
    estado_llamada: str | None = None

    def system_prompt(self) -> str:
        extra = ""
        persona = PERSONAS_DEMO.get(self.persona_id) if self.persona_id else None
        if persona:
            reglas = (
                REGLAS_PERFIL_CLIENTE.get(persona["perfil_conversacional"], [])
                + REGLAS_ESTADO_LLAMADA.get(self.estado_llamada, [])
            )
            if reglas:
                extra = "\n\nREGLAS SEGMENTADAS PARA ESTE CLIENTE:\n" + "\n".join(f"- {r}" for r in reglas)
        return f"{SYSTEM_PROMPT_BASE}\n\n{self.contexto_riesgo}{extra}"

    def transcripcion_texto(self) -> str:
        lineas = []
        for contenido in self.historial:
            rol = "Cliente" if contenido.role == "user" else "Copiloto"
            texto = "".join(p.text for p in contenido.parts if p.text)
            if texto and not texto.startswith(_MARCADOR_INTERNO):
                lineas.append(f"{rol}: {texto}")
        return "\n".join(lineas)


_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


# gemini-3.8-flash es el modelo Flash vigente en el free tier de AI Studio
# modelo. Revisa https://aistudio.google.com/ para el nombre exacto vigente.
MODELOS_LLM = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
]

# Prefijo que marca un mensaje "de sistema" metido como si fuera un turno
# de usuario (Gemini no tiene un rol de sistema intermedio en la
# conversacion, solo system_instruction inicial) -- se usa para reintentar
# automaticamente cuando el modelo no genera texto (ver MAX_REINTENTOS_TEXTO_VACIO
# mas abajo). transcripcion_texto() lo filtra para que nunca aparezca en el
# dashboard ni en el registro de SQLite.
_MARCADOR_INTERNO = "[SISTEMA_INTERNO]"
_NUDGE_TEXTO_VACIO = (
    f"{_MARCADOR_INTERNO} Tu turno anterior no genero ningun mensaje de "
    "texto para el cliente (regla 10). Respondele ahora mismo con algo "
    "breve y natural que continue la conversacion -- no menciones este "
    "aviso ni te disculpes por ello, el cliente no debe notar nada raro."
)
MAX_REINTENTOS_TEXTO_VACIO = 2


def _generar_con_fallback(contents, config):
    ultimo_error = None
    for modelo in MODELOS_LLM:
        inicio = time.perf_counter()
        try:
            respuesta = _get_client().models.generate_content(
                model=modelo, contents=contents, config=config
            )
            duracion = time.perf_counter() - inicio
            if duracion > 3:
                print(f"[LLM] {modelo} tardo {duracion:.2f}s (posible spike)")
            return respuesta
        except genai_errors.ClientError as e:
            duracion = time.perf_counter() - inicio
            if e.code == 429:
                print(f"[LLM] {modelo} dio 429 despues de {duracion:.2f}s, probando siguiente modelo")
                ultimo_error = e
                continue
            raise
    raise ultimo_error


def turno(sesion: Sesion, mensaje_usuario: str | None) -> dict:
    """Ejecuta un turno de la conversacion. mensaje_usuario=None se usa
    SOLO para el primer turno (el chatbot abre la conversacion sin que el
    cliente haya escrito nada todavia)."""
    if mensaje_usuario is not None:
        texto_entrada = mensaje_usuario
    else:
        texto_entrada = "[Inicia la conversacion tu, el cliente aun no ha escrito nada]"

    sesion.historial.append(
        types.Content(role="user", parts=[types.Part(text=texto_entrada)])
    )

    config = types.GenerateContentConfig(
        system_instruction=sesion.system_prompt(),
        tools=[TOOLS],
    )

    texto = ""
    llamadas = []

    for intento in range(MAX_REINTENTOS_TEXTO_VACIO + 1):
        try:
            respuesta = _generar_con_fallback(sesion.historial, config)
        except genai_errors.ClientError as e:
            if e.code == 429:
                return {
                    "texto": "Estamos con mucha demanda en este momento, dame un segundo e intenta de nuevo.",
                    "tool_usada": None,
                    "tool_input": None,
                    "conversacion_cerrada": False,
                }
            raise

        contenido_modelo = respuesta.candidates[0].content
        sesion.historial.append(contenido_modelo)

        texto = "".join(p.text for p in contenido_modelo.parts if p.text)
        llamadas.extend(p.function_call for p in contenido_modelo.parts if p.function_call)

        if texto.strip():
            break

        if intento < MAX_REINTENTOS_TEXTO_VACIO:
            print(f"[LLM] turno sin texto (intento {intento + 1}/{MAX_REINTENTOS_TEXTO_VACIO}), reintentando -- esto agrega una llamada completa extra")
            # El modelo no genero texto (ignoro la regla 10). Le insistimos
            # DENTRO de este mismo request -- el cliente jamas ve este
            # intento vacio ni tiene que escribir nada para "destrabarlo".
            sesion.historial.append(
                types.Content(role="user", parts=[types.Part(text=_NUDGE_TEXTO_VACIO)])
            )

    if not texto.strip():
        # Se agotaron los reintentos. Nunca dejamos al cliente sin nada,
        # y el mensaje es accionable (no un "espera" que no lleva a nada).
        texto = "Disculpa, se me trabo un poco. ¿Me repites lo ultimo para ayudarte mejor?"

    for llamada in llamadas:
        if llamada.name == "actualizar_estado_llamada":
            sesion.estado_llamada = dict(llamada.args)["estado"]

    # Puede haber mas de un function_call de negocio en el mismo turno
    # (ej. escalar_a_humano + registrar_resultado cuando el cliente se
    # molesta). Procesamos cada tool por su propio nombre en vez de
    # quedarnos solo con "la primera", para no perder ninguna:
    candidatas = [l for l in llamadas if l.name != "actualizar_estado_llamada"]
    llamada_reestructuracion = next((l for l in candidatas if l.name == "proponer_reestructuracion"), None)
    llamada_escalar = next((l for l in candidatas if l.name == "escalar_a_humano"), None)
    llamada_registrar = next((l for l in candidatas if l.name == "registrar_resultado"), None)

    if llamada_reestructuracion:
        sesion.propuesta_reestructuracion = dict(llamada_reestructuracion.args)

    if llamada_registrar:
        resultado = dict(llamada_registrar.args)
        sesion.resultado_registrado = resultado
        persona = PERSONAS_DEMO.get(sesion.persona_id) if sesion.persona_id else None
        guardar_registro(
            sesion_id=sesion.sesion_id,
            estado_final=resultado["estado_final"],
            resumen=resultado["resumen"],
            transcripcion=sesion.transcripcion_texto(),
            fecha_acordada=resultado.get("fecha_acordada"),
            tipo_propuesta=(sesion.propuesta_reestructuracion or {}).get("tipo"),
            score_riesgo=sesion.score_riesgo,
            calificacion_satisfaccion=resultado.get("calificacion_satisfaccion"),
            calificacion_trato=resultado.get("calificacion_trato"),
            nombre_cliente=persona["nombre"] if persona else None,
        )

    # El CIERRE real depende solo de si hubo registrar_resultado, sin
    # importar el orden en que llegaron las tools. El BADGE que se muestra
    # en el frontend/dashboard, en cambio, prioriza escalar_a_humano cuando
    # esta presente porque es la senal mas util para un gestor humano
    # revisando el caso -- aunque la conversacion tambien haya cerrado en
    # el mismo turno.
    if llamada_escalar:
        llamada_mostrar = llamada_escalar
    elif llamada_registrar:
        llamada_mostrar = llamada_registrar
    else:
        llamada_mostrar = llamada_reestructuracion

    return {
        "texto": texto,
        "tool_usada": llamada_mostrar.name if llamada_mostrar else None,
        "tool_input": dict(llamada_mostrar.args) if llamada_mostrar else None,
        "conversacion_cerrada": llamada_registrar is not None,
    }