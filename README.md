# Copiloto de Salud Financiera — Bancoagrícola (Entropy Hack)

Proyecto de hackathon: un copiloto conversacional que contacta proactivamente a
clientes en riesgo de mora, conversa con ellos (texto + voz) para entender su
situación y negociar una fecha de pago o una reestructuración, y deja todo
registrado para que un panel interno lo pueda revisar.

El sistema tiene tres piezas:

- **`backend/`** — API en FastAPI que corre un modelo de riesgo (XGBoost) y
  orquesta la conversación con un LLM (Gemini).
- **`frontend/VectorFinanceCoaching/`** — App en Expo/React Native (funciona
  también en web) donde el cliente chatea con el copiloto y el banco revisa
  el dashboard de resultados.
- **`backend/ml/FinancePredictor.ipynb`** — Notebook con el pipeline que se usó
  para el estudio y entrenamiento del modelo de riesgo. Es material de
  referencia/reproducibilidad, no se ejecuta en producción.

## Cómo funciona (flujo general)

1. El frontend manda los datos financieros del usuario a `POST /chat/iniciar`.
2. El backend corre el modelo XGBoost y calcula un `score_riesgo`.
3. Con ese resultado arma un contexto de riesgo y abre una sesión de chat.
4. Le pide al LLM (Gemini) que abra la conversación con el cliente.
5. El frontend va mandando cada respuesta del cliente a `POST /chat/mensaje`
   junto con el `sesion_id` recibido, y el copiloto va respondiendo (con
   texto y audio generado por TTS) hasta cerrar el caso.
6. Cada conversación cerrada queda guardada en SQLite y es consultable desde
   el panel de dashboard (`/dashboard/registros`, `/dashboard/metricas`).

## Backend (`backend/`)

Stack: FastAPI + XGBoost (vía `joblib`) + Gemini (`google-genai`) + SQLite +
`edge-tts` para generar audio.

### Componentes

| Archivo | Qué hace |
|---|---|
| `app/main.py` | Punto de entrada de la API. Define los endpoints (`/predecir`, `/chat/iniciar`, `/chat/mensaje`, `/chat/{id}/resultado`, `/dashboard/*`), carga el modelo entrenado y reconstruye las features que el modelo espera a partir de los datos que manda el frontend. |
| `services/Copiloto.py` | El motor de la conversación: mantiene la `Sesion` (historial, estado, resultado), arma el `system_prompt`, llama a Gemini con fallback entre varios modelos si hay rate-limit (429), y procesa las *tool calls* que el LLM puede disparar (proponer reestructuración, escalar a humano, registrar resultado, actualizar estado de la llamada). |
| `services/contexto_riesgo.py` | Traduce el score y las features del modelo a un contexto en lenguaje natural para el LLM: causa principal del riesgo, "arquetipo" de comportamiento del cliente, y si el banco está dentro o fuera de horario hábil. |
| `services/herramientas.py` | Declaración de las *tools* (function calling) que el LLM puede invocar durante la conversación. |
| `services/prompts.py` | El system prompt base que define el rol, tono y reglas del copiloto ("Archie"). |
| `services/Personas.py` | Personas demo predefinidas (para hacer pruebas/demos rápidas) y reglas de conversación según perfil del cliente y estado emocional detectado en la llamada. |
| `services/registro.py` | Persistencia en SQLite (`registro_cobranza.db`): guarda cada conversación cerrada y expone las consultas que usa el dashboard (listado y métricas agregadas). |
| `services/voiceGeneration.py` | Genera el audio (texto a voz, en español) de cada turno del copiloto usando `edge-tts`, con timeout para no trabar el chat si el servicio de voz falla. |
| `services/xgb_model.joblib` | Modelo XGBoost ya entrenado, listo para servir. |
| `ml/FinancePredictor.ipynb` | Notebook de referencia: es el pipeline completo (carga de datos, limpieza, feature engineering, entrenamiento y comparación de modelos, feature importance) que se usó para el estudio y para entrenar el modelo que termina guardado en `xgb_model.joblib`. No forma parte del flujo en producción. |
| `ml/dataset/` | Dataset usado para entrenar/evaluar el modelo (Give Me Some Credit). |

> **Nota:** `scripts/Inputs.py` ya no se usa (quedó de una iteración anterior). Se puede ignorar.

### Cómo montarlo

Requisitos: Python 3.11+ y una API key de Gemini ([Google AI Studio](https://aistudio.google.com/)).

```bash
cd backend
pip install fastapi uvicorn joblib pandas xgboost google-genai python-dotenv edge-tts

cp .env.example .env
# editar .env y poner tu GEMINI_API_KEY real

uvicorn app.main:app --reload --port 8000
```

Luego abrir `http://localhost:8000/docs` para probar los endpoints
interactivamente (Swagger UI).

⚠️ **Importante:** `app/main.py` carga el modelo con una ruta absoluta de
Windows (`C:\Users\...`) que quedó hardcodeada del entorno de desarrollo
original. Si vas a correrlo en otra máquina, hay que cambiar esa línea por
una ruta relativa, por ejemplo:

```python
modelo = joblib.load("services/xgb_model.joblib")
```

## Frontend (`frontend/VectorFinanceCoaching/`)

App hecha con **Expo Router** (React Native + soporte web), TypeScript.

### Pantallas principales (`src/app/screens/`)

- **`Homescreen.tsx`** — Pantalla de bienvenida ("Comenzar" / "Ver panel interno").
- **`Chatscreen.tsx`** — El chat con el copiloto: llama a `/chat/iniciar` y
  `/chat/mensaje` en el backend, muestra los mensajes y reproduce el audio
  generado.
- **`Dashboardscreen.tsx`** — Panel interno del banco: consume
  `/dashboard/registros` y `/dashboard/metricas` para mostrar las
  conversaciones cerradas y las métricas agregadas.
- **`Personascreen.tsx`** — Selector de personas demo para probar distintos
  perfiles de cliente sin tener que llenar datos manualmente.

Componentes de soporte en `src/components/chat/` (burbuja de chat, header,
barra de entrada de voz, barra de llamada finalizada) y `src/components/`
(temas, iconos animados, reproducción de transcripción, etc).

### Cómo montarlo

Requisitos: Node.js y npm.

```bash
cd frontend/VectorFinanceCoaching
npm install
npm run web      # o: npm run android / npm run ios
```

La app espera que el backend esté corriendo en `http://localhost:8000`
(ver `API_BASE_URL` en `Chatscreen.tsx` y `Dashboardscreen.tsx`). Si el
backend corre en otra URL o puerto, hay que actualizar esa constante en
ambos archivos.

## Notebook de Machine Learning

`backend/ml/FinancePredictor.ipynb` documenta el pipeline usado para el
estudio y entrenamiento del modelo de riesgo: carga del dataset, limpieza,
feature engineering, split de datos, comparación de Random Forest vs
XGBoost, análisis de feature importance, y guardado del modelo final
(`xgb_model.joblib`) que consume el backend. Es material de análisis/
reproducibilidad del modelo, no algo que se ejecute en producción.
