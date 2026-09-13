import edge_tts
import base64
import io
import asyncio
import time

CHATBOT_VOICE = "es-MX-JorgeNeural"

# edge_tts es un servicio no oficial (sin SLA) -- puede colgarse sin avisar.
# Este timeout evita que un cuelgue de la voz trabe toda la respuesta del
# chat durante la demo: si se pasa del limite, devolvemos audio vacio y el
# frontend simplemente no reproduce nada para ese turno (el texto si llega
# normal via /chat/mensaje).
TIMEOUT_TTS_SEGUNDOS = 8


async def _generar_audio(texto: str, voz: str) -> str:
    comunicador = edge_tts.Communicate(texto, voz)
    buffer = io.BytesIO()
    async for chunk in comunicador.stream():
        if chunk["type"] == "audio":
            buffer.write(chunk["data"])
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


async def generar_audio_base64(texto: str, voz: str = CHATBOT_VOICE) -> str:
    inicio = time.perf_counter()
    try:
        audio = await asyncio.wait_for(_generar_audio(texto, voz), timeout=TIMEOUT_TTS_SEGUNDOS)
    except Exception as e:
        print(f"[TTS] fallo/timeout despues de {time.perf_counter() - inicio:.2f}s: {e!r}")
        return ""
    duracion = time.perf_counter() - inicio
    if duracion > 2:
        print(f"[TTS] tardo {duracion:.2f}s (posible spike)")
    return audio