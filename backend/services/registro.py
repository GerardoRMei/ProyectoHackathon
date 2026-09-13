import sqlite3
from datetime import datetime
from zoneinfo import ZoneInfo

DB_PATH = "registro_cobranza.db"
TIMEZONE_EL_SALVADOR = ZoneInfo("America/El_Salvador")


def _conexion():
    return sqlite3.connect(DB_PATH)


def inicializar_db():
    """Llamar una vez al arrancar la API (en main.py)."""
    with _conexion() as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS registros (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sesion_id TEXT NOT NULL,
                fecha_hora TEXT NOT NULL,
                estado_final TEXT NOT NULL,
                resumen TEXT NOT NULL,
                fecha_acordada TEXT,
                tipo_propuesta TEXT,
                score_riesgo REAL,
                transcripcion TEXT NOT NULL,
                calificacion_satisfaccion INTEGER,
                calificacion_trato INTEGER
            )
        """)
        _migrar_columnas_nuevas(con)


def _migrar_columnas_nuevas(con):
    """CREATE TABLE IF NOT EXISTS no modifica una tabla que ya existe --
    si el .db se creo con una version anterior del schema (sin estas
    columnas), esto las agrega sin perder los registros que ya haya.
    Evita el error 'no such column' cada vez que se agregue un campo
    nuevo mientras se sigue iterando durante el hackathon."""
    columnas_esperadas = {
        "calificacion_satisfaccion": "INTEGER",
        "calificacion_trato": "INTEGER",
    }
    columnas_actuales = {
        fila[1] for fila in con.execute("PRAGMA table_info(registros)").fetchall()
    }
    for columna, tipo in columnas_esperadas.items():
        if columna not in columnas_actuales:
            con.execute(f"ALTER TABLE registros ADD COLUMN {columna} {tipo}")


def guardar_registro(
    sesion_id: str,
    estado_final: str,
    resumen: str,
    transcripcion: str,
    fecha_acordada: str | None = None,
    tipo_propuesta: str | None = None,
    score_riesgo: float | None = None,
    calificacion_satisfaccion: int | None = None,
    calificacion_trato: int | None = None,
):
    with _conexion() as con:
        con.execute(
            """INSERT INTO registros
               (sesion_id, fecha_hora, estado_final, resumen, fecha_acordada,
                tipo_propuesta, score_riesgo, transcripcion,
                calificacion_satisfaccion, calificacion_trato)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                sesion_id,
                datetime.now(TIMEZONE_EL_SALVADOR).isoformat(),
                estado_final,
                resumen,
                fecha_acordada,
                tipo_propuesta,
                score_riesgo,
                transcripcion,
                calificacion_satisfaccion,
                calificacion_trato,
            ),
        )


def obtener_registros():
    """Para que el dashboard liste todas las conversaciones cerradas."""
    with _conexion() as con:
        con.row_factory = sqlite3.Row
        filas = con.execute(
            "SELECT * FROM registros ORDER BY fecha_hora DESC"
        ).fetchall()
        return [dict(fila) for fila in filas]


def obtener_metricas():
    """Numeros rapidos para la pestaña de observabilidad / metricas."""
    with _conexion() as con:
        total = con.execute("SELECT COUNT(*) FROM registros").fetchone()[0]
        por_estado = dict(
            con.execute(
                "SELECT estado_final, COUNT(*) FROM registros GROUP BY estado_final"
            ).fetchall()
        )
        con_acuerdo = con.execute(
            "SELECT COUNT(*) FROM registros WHERE fecha_acordada IS NOT NULL"
        ).fetchone()[0]
        promedio_satisfaccion = con.execute(
            "SELECT AVG(calificacion_satisfaccion) FROM registros "
            "WHERE calificacion_satisfaccion IS NOT NULL"
        ).fetchone()[0]
        promedio_trato = con.execute(
            "SELECT AVG(calificacion_trato) FROM registros "
            "WHERE calificacion_trato IS NOT NULL"
        ).fetchone()[0]
        total_con_feedback = con.execute(
            "SELECT COUNT(*) FROM registros WHERE calificacion_satisfaccion IS NOT NULL "
            "OR calificacion_trato IS NOT NULL"
        ).fetchone()[0]
    return {
        "total_conversaciones": total,
        "por_estado": por_estado,
        "conversaciones_con_fecha_acordada": con_acuerdo,
        "promedio_calificacion_satisfaccion": round(promedio_satisfaccion, 2) if promedio_satisfaccion else None,
        "promedio_calificacion_trato": round(promedio_trato, 2) if promedio_trato else None,
        "total_conversaciones_con_feedback": total_con_feedback,
    }