from datetime import datetime
from zoneinfo import ZoneInfo


# Orden de importancia de features, tal como salio del .feature_importances_
# del XGBoost en el notebook (de mayor a menor peso). Se usa para decidir
# CUAL es "la causa principal" a explicarle al LLM cuando hay varias
# senales de riesgo a la vez.
ORDEN_IMPORTANCIA = [
    "TotalPastDue",
    "HighUtilizationFlag",
    "RevolvingUtilizationOfUnsecuredLines",
    "NumberOfTimes90DaysLate",
    "NumberOfTime60-89DaysPastDueNotWorse",
    "NumberOfTime30-59DaysPastDueNotWorse",
    "NumberRealEstateLoansOrLines",
    "CreditLinesPerAge",
    "DebtRatio",
]

TIMEZONE_EL_SALVADOR = ZoneInfo("America/El_Salvador")
HORARIO_CHATBOT = {
    0: (8, 20),  # lunes
    1: (8, 20),  # martes
    2: (8, 20),  # miércoles
    3: (8, 20),  # jueves
    4: (8, 20),  # viernes
}


# Calculo de hora habil para el chatbot.
def _es_horario_habil(ahora: datetime | None = None) -> bool:
    ahora = ahora or datetime.now(TIMEZONE_EL_SALVADOR)
    rango = HORARIO_CHATBOT.get(ahora.weekday())
    if rango is None:
        return False
    apertura, cierre = rango
    return apertura <= ahora.hour < cierre


#  Definir frase para el prompt del LLM que describe si estamos dentro o fuera del horario habil
def describir_horario_habil(ahora: datetime | None = None) -> str:

    ahora = ahora or datetime.now(TIMEZONE_EL_SALVADOR)

    if _es_horario_habil(ahora):
        return "Estamos dentro del horario habil para el chatbot."
    return ("En este moment el banco esta FUERA de horario de atencion "
        f"({ahora.strftime('%A %H:%M')}, hora El Salvador). Si el caso necesita "
        "escalar a un humano, debe quedar registrado para atenderse el "
        "siguiente dia habil -- no ofrezcas una llamada o respuesta inmediata.")


def _causa_principal(features: dict) -> str:
    """Recorre las features en orden de importancia real del modelo y
    devuelve la primera que esta "activada", para no mandarle al LLM un
    diccionario crudo sino una causa priorizada."""
    if features.get("TotalPastDue", 0) > 0:
        return "atrasos_previos"
    if features.get("HighUtilizationFlag", 0) == 1:
        return "utilizacion_alta"
    if features.get("RevolvingUtilizationOfUnsecuredLines", 0) > 0.6:
        return "utilizacion_moderada"
    if features.get("DebtRatio", 0) > 0.5:
        return "debt_ratio_alto"
    return "patron_general"


AGE_BINS = [0, 25, 35, 45, 55, 65, 120]
UTILIZACION_P75_POR_BIN = {
    (0, 25): 1.00,
    (25, 35): 0.89,
    (35, 45): 0.70,
    (45, 55): 0.58,
    (55, 65): 0.42,
    (65, 120): 0.19,
}


def _bin_de_edad(edad: int) -> tuple:
    """Replica el mismo binning que se uso en el preentrenamiento
    (pd.cut con AGE_BINS), para que la logica de produccion coincida
    con el analisis que se hizo en el notebook."""
    for i in range(len(AGE_BINS) - 1):
        piso, techo = AGE_BINS[i], AGE_BINS[i + 1]
        if piso < edad <= techo:
            return (piso, techo)
    return AGE_BINS[-2], AGE_BINS[-1]


def clasificar_arquetipo(datos_usuario: dict, features: dict, en_riesgo: bool) -> str:
    """Clasifica el caso segun PATRON DE COMPORTAMIENTO, no segun edad..."""
    if not en_riesgo:
        # El modelo (score real, con su umbral de negocio) determino que
        # el cliente NO esta en riesgo. No importa que alguna senal aislada
        # (ej. utilizacion alta) se vea elevada por las reglas de umbral de
        # abajo -- si el modelo no lo marco como en_riesgo, no abrimos con
        # tono de alerta ni ofrecemos ajustes todavia.
        return "bajo_riesgo"

    atrasos_90 = features.get("NumberOfTimes90DaysLate", 0)
    total_atrasos = features.get("TotalPastDue", 0)
    revolving = features.get("RevolvingUtilizationOfUnsecuredLines", 0)

    if atrasos_90 >= 1 or total_atrasos >= 3:
        return "reincidente"

    bin_edad = _bin_de_edad(datos_usuario["age"])
    umbral_utilizacion = UTILIZACION_P75_POR_BIN[bin_edad]
    utilizacion_alta_para_su_grupo = revolving >= umbral_utilizacion

    if utilizacion_alta_para_su_grupo and total_atrasos >= 1:
        return "presion_sostenida"

    if utilizacion_alta_para_su_grupo and total_atrasos == 0:
        return "tension_temprana"

    if 1 <= total_atrasos <= 2:
        return "atraso_aislado"

    return "sin_patron_claro"


CAUSA_EXPLICACION = {
    "atrasos_previos": "el cliente ha tenido pagos atrasados en meses recientes (30-59, 60-89 o 90+ dias)",
    "utilizacion_alta": "el cliente esta usando una porcion muy alta de su linea de credito disponible (por encima del umbral critico)",
    "utilizacion_moderada": "el cliente esta usando una porcion moderadamente alta de su linea de credito disponible",
    "debt_ratio_alto": "el cliente tiene una proporcion alta de deuda mensual respecto a sus ingresos",
    "patron_general": "no hay una sola senal aislada dominante, pero la combinacion de sus datos financieros sugiere riesgo",
}


def construir_contexto_riesgo(resultado_modelo: dict, datos_usuario: dict, features: dict) -> str:
    causa = _causa_principal(features)
    arquetipo = clasificar_arquetipo(datos_usuario, features, resultado_modelo["en_riesgo"])
    explicacion_causa = CAUSA_EXPLICACION[causa]

    return (
        f"Patron de comportamiento detectado: {arquetipo}\n"
        f"Causa principal detectada por el modelo (uso INTERNO tuyo -- nunca reveles "
        f"estos nombres tecnicos, el score, ni la palabra 'modelo' o 'algoritmo' al "
        f"cliente; usala solo para entender y, SI el cliente pregunta por que lo "
        f"contactas o por que dicen que tiene riesgo, tradusela a lenguaje humano y "
        f"cotidiano sin mencionar de donde sale): {explicacion_causa}.\n"
        f"Score de riesgo interno: {resultado_modelo['score_riesgo']} "
        f"(en_riesgo={resultado_modelo['en_riesgo']}) -- solo para tu criterio, jamas "
        f"lo menciones ni des un numero parecido."
    )