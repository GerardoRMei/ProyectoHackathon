
PERFILES_DEMO = [
    {
        "nombre": "Ana - Cliente sana",
        "descripcion": "Sin atrasos, utilizacion baja, ingreso estable. Debe salir en verde.",
        "datos": {
            "RevolvingUtilizationOfUnsecuredLines": 0.12,
            "age": 34,
            "NumberOfTime30-59DaysPastDueNotWorse": 0,
            "DebtRatio": 0.18,
            "MonthlyIncome": 2800,
            "NumberOfOpenCreditLinesAndLoans": 6,
            "NumberOfTimes90DaysLate": 0,
            "NumberRealEstateLoansOrLines": 1,
            "NumberOfTime60-89DaysPastDueNotWorse": 0,
            "NumberOfDependents": 1,
        },
    },
    {
        "nombre": "Carlos - Riesgo temprano por utilizacion",
        "descripcion": (
            "Sin atrasos todavia, pero ya esta usando >80% de su linea de "
            "credito. Es el caso ideal para el mensaje preventivo (ajustar "
            "cuota) ANTES de que aparezca un atraso real."
        ),
        "datos": {
            "RevolvingUtilizationOfUnsecuredLines": 0.91,
            "age": 29,
            "NumberOfTime30-59DaysPastDueNotWorse": 0,
            "DebtRatio": 0.42,
            "MonthlyIncome": 1600,
            "NumberOfOpenCreditLinesAndLoans": 4,
            "NumberOfTimes90DaysLate": 0,
            "NumberRealEstateLoansOrLines": 0,
            "NumberOfTime60-89DaysPastDueNotWorse": 0,
            "NumberOfDependents": 2,
        },
    },
    {
        "nombre": "Beatriz - Atraso reciente aislado",
        "descripcion": (
            "Un par de atrasos de 30-59 dias, DebtRatio ya elevado. "
            "Muestra la rama de 'cambio de patron' del mensaje, no la de "
            "utilizacion."
        ),
        "datos": {
            "RevolvingUtilizationOfUnsecuredLines": 0.55,
            "age": 41,
            "NumberOfTime30-59DaysPastDueNotWorse": 2,
            "DebtRatio": 0.68,
            "MonthlyIncome": 2100,
            "NumberOfOpenCreditLinesAndLoans": 8,
            "NumberOfTimes90DaysLate": 0,
            "NumberRealEstateLoansOrLines": 1,
            "NumberOfTime60-89DaysPastDueNotWorse": 0,
            "NumberOfDependents": 3,
        },
    },
    {
        "nombre": "David - Riesgo alto ya consolidado",
        "descripcion": (
            "Multiples atrasos en las tres categorias (30-59, 60-89, 90+). "
            "TotalPastDue alto -- es la feature con mas peso en el modelo, "
            "asi que este perfil deberia dar el score mas alto de los 5."
        ),
        "datos": {
            "RevolvingUtilizationOfUnsecuredLines": 0.97,
            "age": 52,
            "NumberOfTime30-59DaysPastDueNotWorse": 2,
            "DebtRatio": 1.10,
            "MonthlyIncome": 1200,
            "NumberOfOpenCreditLinesAndLoans": 10,
            "NumberOfTimes90DaysLate": 1,
            "NumberRealEstateLoansOrLines": 2,
            "NumberOfTime60-89DaysPastDueNotWorse": 1,
            "NumberOfDependents": 4,
        },
    },
    {
        "nombre": "Elena - Caso frontera",
        "descripcion": (
            "Senales mixtas (ingreso decente, pero utilizacion y DebtRatio "
            "medios, un atraso leve). Util para mostrar en vivo que mover "
            "UMBRAL_RIESGO en API.py cambia si este caso activa el chatbot "
            "o no."
        ),
        "datos": {
            "RevolvingUtilizationOfUnsecuredLines": 0.48,
            "age": 37,
            "NumberOfTime30-59DaysPastDueNotWorse": 1,
            "DebtRatio": 0.35,
            "MonthlyIncome": 2000,
            "NumberOfOpenCreditLinesAndLoans": 5,
            "NumberOfTimes90DaysLate": 0,
            "NumberRealEstateLoansOrLines": 1,
            "NumberOfTime60-89DaysPastDueNotWorse": 0,
            "NumberOfDependents": 0,
        },
    },
]
 
 
if __name__ == "__main__":
    # Prueba rapida: mandar los 5 perfiles al endpoint /predecir y ver el score.
    # Requiere que la API este corriendo (uvicorn api:app --reload --port 8000).
    import requests
 
    for perfil in PERFILES_DEMO:
        r = requests.post("http://localhost:8000/predecir", json=perfil["datos"])
        print(f"{perfil['nombre']:35s} -> {r.json()}")
 




