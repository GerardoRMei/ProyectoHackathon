from google.genai import types

PROPONER_REESTRUCTURACION = {
    "name": "proponer_reestructuracion",
    "description": "Registra la propuesta concreta de ajuste que el cliente acepto.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "tipo": {
                "type": "STRING",
                "enum": ["ajuste_fecha_corte", "extension_plazo"],
            },
            "nuevo_plazo_meses": {
                "type": "INTEGER",
                "description": "Solo si tipo=extension_plazo",
            },
            "resumen": {
                "type": "STRING",
                "description": "Una linea humana de lo acordado",
            },
        },
        "required": ["tipo", "resumen"],
    },
}

ESCALAR_A_HUMANO = {
    "name": "escalar_a_humano",
    "description": "El caso necesita un gestor humano en vez del chatbot.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "motivo": {"type": "STRING"},
        },
        "required": ["motivo"],
    },
}

REGISTRAR_RESULTADO = {
    "name": "registrar_resultado",
    "description": "Cierra la conversacion y deja el registro que alimenta el dashboard.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "estado_final": {
                "type": "STRING",
                "enum": ["resuelto_chatbot", "escalado_humano", "cliente_sin_riesgo_real", "intento_prompt_malicioso"],
            },
            "resumen": {"type": "STRING"},
            "fecha_acordada": {
                "type": "STRING",
                "description": "Fecha (YYYY-MM-DD) acordada con el cliente, solo si hubo acuerdo de pago o reestructuracion. Omitir si no aplica.",
            },
            "calificacion_satisfaccion": {
                "type": "INTEGER",
                "description": "Del 1 al 5, que tan satisfecho quedo el cliente. Solo si el cliente lo dio explicitamente, omitir si no.",
            },
            "calificacion_trato": {
                "type": "INTEGER",
                "description": "Del 1 al 5, como califico el cliente la amabilidad/trato recibido. Solo si el cliente lo dio explicitamente, omitir si no.",
            },
        },
        "required": ["estado_final", "resumen"],
    },
}

ACTUALIZAR_ESTADO_LLAMADA = {
    "name": "actualizar_estado_llamada",
    "description": "Actualiza el estado emocional/situacional observado del cliente EN ESTE turno, sin cerrar la conversación.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "estado": {
                "type": "STRING",
                "enum": ["cooperativo", "evasivo", "poco_tiempo", "dificultad_economica", "molesto"],
            },
        },
        "required": ["estado"],
    },
}

TOOLS = types.Tool(
    function_declarations=[
        PROPONER_REESTRUCTURACION,
        ESCALAR_A_HUMANO,
        REGISTRAR_RESULTADO,
        ACTUALIZAR_ESTADO_LLAMADA,
    ]
)