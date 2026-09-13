PERSONAS_DEMO = {
    "sofia": {
        "nombre": "Sofía Carpio",
        "perfil_conversacional": "olvidadizo",
        "estado_inicial": "cooperativo",
        "canal_preferido": "whatsapp",
    },
    "sebastian": {
        "nombre": "Sebastián Hernández",
        "perfil_conversacional": "olvidadizo",
        "estado_inicial": "evasivo",
        "canal_preferido": "calendario",
    },
    "ricardo": {
        "nombre": "Ricardo Arias",
        "perfil_conversacional": "olvidadizo",
        "estado_inicial": "poco_tiempo",
        "canal_preferido": "banca_movil",
    },
    "jorge": {
        "nombre": "Jorge Benavides",
        "perfil_conversacional": "procrastinador",
        "estado_inicial": "dificultad_economica",
        "canal_preferido": "whatsapp",
    },
    "rodrigo": {
        "nombre": "Rodrigo Vanegas",
        "perfil_conversacional": "cliente_recurrente",  # OJO: renombrado, "reincidente" ya lo usa clasificar_arquetipo()
        "estado_inicial": "molesto",
        "canal_preferido": "voz",
    },
}

REGLAS_PERFIL_CLIENTE = {
    "olvidadizo": [
        "Relaciona la fecha con una rutina o evento recordable.",
        "Evita interpretar el olvido como falta de interés.",
    ],
    "procrastinador": [
        "Transforma expresiones futuras (\"después\", \"luego\") en fecha y hora concretas.",
        "Relaciona el acuerdo con un ingreso o evento verificable.",
    ],
    "cliente_recurrente": [
        "Reconoce el historial sin etiquetar a la persona.",
        "Resume lo expresado antes de plantear el siguiente paso.",
    ],
}

REGLAS_ESTADO_LLAMADA = {
    "cooperativo": ["Avanza paso a paso.", "Confirma la elección y el canal de recordatorio."],
    "evasivo": ["Mantén turnos breves.", "Ofrece dos opciones como máximo."],
    "poco_tiempo": ["Usa un máximo de dos frases por turno.", "Resume fecha, acción y confirmación."],
    "dificultad_economica": ["Pregunta por el momento en que espera contar con recursos.", "Ofrece seguimiento si aún no puede definir fecha."],
    "molesto": ["Permite que la persona explique primero su inconformidad.", "Pide autorización antes de retomar el tema.", "Mantén una pregunta por turno."],
}