import edge_tts
import base64
import io

CHATBOT_VOICE = "es-MX-DaliaNeural"

async def generar_audio_base64(texto: str, voz: str = CHATBOT_VOICE) -> str:
    comunicador = edge_tts.Communicate(texto, voz)
    buffer = io.BytesIO()
    async for chunk in comunicador.stream():
        if chunk["type"] == "audio":
            buffer.write(chunk["data"])
    return base64.b64encode(buffer.getvalue()).decode("utf-8")
