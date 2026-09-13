export type EstadoFinal =
  | 'resuelto_chatbot'
  | 'escalado_humano'
  | 'cliente_sin_riesgo_real'
  | string;

export interface Registro {
  id: number | string;
  sesion_id: string;
  fecha_hora: string;
  resumen: string;
  estado_final: EstadoFinal;
  score_riesgo?: number | null;
  fecha_acordada?: string | null;
  calificacion_satisfaccion?: number | null;
  calificacion_trato?: number | null;
  transcripcion?: string | null;
  nombre_cliente?: string | null;
}

export interface Metricas {
  total_conversaciones: number;
  conversaciones_con_fecha_acordada: number;
  por_estado?: Record<string, number>;
  promedio_calificacion_satisfaccion?: number | null;
  promedio_calificacion_trato?: number | null;
}

export interface TurnoTranscripcion {
  rol: string;
  texto: string;
}