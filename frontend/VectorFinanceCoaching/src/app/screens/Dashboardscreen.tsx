import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import TranscriptReplay from '../../components/Transcriptreplay';
import { COLORS } from './dashboard/theme';
import { Registro, Metricas } from '../../components/Types';

// Ajusta esto a donde corre tu FastAPI local durante la demo
const API_BASE_URL = 'http://localhost:8000';

interface EstadoConfigEntry {
  label: string;
  bg: string;
  border: string;
  text: string;
}

const ESTADO_CONFIG: Record<string, EstadoConfigEntry> = {
  resuelto_chatbot: { label: 'Resuelto por Copiloto', ...COLORS.success },
  escalado_humano: { label: 'Escalado a asesor', ...COLORS.warning },
  cliente_sin_riesgo_real: { label: 'Sin riesgo real', ...COLORS.info },
};

function formatearFecha(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-SV', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatearPromedio(valor?: number | null): string {
  return valor != null ? valor.toFixed(1) : '—';
}

interface MetricasBarProps {
  metricas: Metricas | null;
}

function MetricasBar({ metricas }: MetricasBarProps) {
  if (!metricas) return null;
  return (
    <View style={styles.metricsBar}>
      <View style={styles.metricItem}>
        <Text style={styles.metricNumber}>{metricas.total_conversaciones}</Text>
        <Text style={styles.metricLabel}>Conversaciones</Text>
      </View>
      <View style={styles.metricItem}>
        <Text style={styles.metricNumber}>
          {metricas.conversaciones_con_fecha_acordada}
        </Text>
        <Text style={styles.metricLabel}>Con acuerdo de pago</Text>
      </View>
      <View style={styles.metricItem}>
        <Text style={styles.metricNumber}>
          {metricas.por_estado?.escalado_humano ?? 0}
        </Text>
        <Text style={styles.metricLabel}>Escaladas</Text>
      </View>
      <View style={styles.metricDivider} />
      <View style={styles.metricItem}>
        <Text style={styles.metricNumberFeedback}>
          {formatearPromedio(metricas.promedio_calificacion_satisfaccion)}
        </Text>
        <Text style={styles.metricLabel}>Satisfacción (1-5)</Text>
      </View>
      <View style={styles.metricItem}>
        <Text style={styles.metricNumberFeedback}>
          {formatearPromedio(metricas.promedio_calificacion_trato)}
        </Text>
        <Text style={styles.metricLabel}>Trato (1-5)</Text>
      </View>
    </View>
  );
}

interface RegistroCardProps {
  registro: Registro;
  onVerTranscripcion: (registro: Registro) => void;
}

function RegistroCard({ registro, onVerTranscripcion }: RegistroCardProps) {
  const estado: EstadoConfigEntry =
    ESTADO_CONFIG[registro.estado_final] ?? {
      label: registro.estado_final,
      ...COLORS.neutral,
    };

  return (
    <View style={styles.card}>
      <View style={styles.cardAccent} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Sesión {registro.sesion_id.slice(0, 8)}</Text>
            <Text style={styles.cardDate}>{formatearFecha(registro.fecha_hora)}</Text>
          </View>
          {registro.score_riesgo != null && (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>
                {(registro.score_riesgo * 100).toFixed(0)}%
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.resumen} numberOfLines={2}>
          {registro.resumen}
        </Text>

        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: estado.bg, borderColor: estado.border }]}>
            <Text style={[styles.statusText, { color: estado.text }]}>{estado.label}</Text>
          </View>

          {registro.fecha_acordada ? (
            <View style={styles.fechaAcordadaChip}>
              <Text style={styles.fechaAcordadaText}>Pago: {registro.fecha_acordada}</Text>
            </View>
          ) : null}

          {(registro.calificacion_satisfaccion || registro.calificacion_trato) ? (
            <View style={styles.feedbackChip}>
              <Text style={styles.feedbackChipText}>
                ⭐ {registro.calificacion_satisfaccion ?? '—'} · 🤝 {registro.calificacion_trato ?? '—'}
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.transcriptButton}
          onPress={() => onVerTranscripcion(registro)}
        >
          <Text style={styles.transcriptButtonText}>▶ Ver transcripción</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface DashboardScreenProps {
  onVolver?: () => void;
}

export default function DashboardScreen({ onVolver }: DashboardScreenProps) {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);
  const [registroSeleccionado, setRegistroSeleccionado] = useState<Registro | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      const [resRegistros, resMetricas] = await Promise.all([
        fetch(`${API_BASE_URL}/dashboard/registros`),
        fetch(`${API_BASE_URL}/dashboard/metricas`),
      ]);
      setRegistros((await resRegistros.json()) as Registro[]);
      setMetricas((await resMetricas.json()) as Metricas);
    } catch (err) {
      console.error('Error cargando el dashboard:', err);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>bancoagrícola · panel interno</Text>
          <Text style={styles.title}>Cobranza Preventiva</Text>
        </View>
        {onVolver && (
          <TouchableOpacity onPress={onVolver} style={styles.volverButton}>
            <Text style={styles.volverButtonText}>← Volver al chat</Text>
          </TouchableOpacity>
        )}
      </View>
      <MetricasBar metricas={metricas} />

      <FlatList
        data={registros}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => {
              setRefrescando(true);
              cargarDatos();
            }}
            tintColor={COLORS.accent}
          />
        }
        renderItem={({ item }) => (
          <RegistroCard registro={item} onVerTranscripcion={setRegistroSeleccionado} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Todavía no hay conversaciones registradas.</Text>
        }
      />

      <TranscriptReplay
        visible={!!registroSeleccionado}
        registro={registroSeleccionado}
        onClose={() => setRegistroSeleccionado(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: COLORS.bgDark,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: { fontSize: 21, fontWeight: '700', color: COLORS.textOnDark, marginTop: 2 },
  volverButton: { paddingVertical: 4, paddingHorizontal: 8 },
  volverButtonText: { color: COLORS.accent, fontWeight: '600', fontSize: 13 },
  metricsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: -18,
    marginBottom: 4,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  metricDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  metricItem: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  metricNumber: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  metricNumberFeedback: { fontSize: 18, fontWeight: '700', color: COLORS.accentText },
  metricLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardAccent: { width: 4, backgroundColor: COLORS.accent },
  cardBody: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  cardDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  scoreBadge: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreBadgeText: { color: COLORS.textOnDark, fontSize: 12, fontWeight: '700' },
  resumen: { fontSize: 13, color: '#475569', marginTop: 10, lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  statusBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  fechaAcordadaChip: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fechaAcordadaText: { fontSize: 11, color: '#0F766E', fontWeight: '600' },
  feedbackChip: {
    backgroundColor: '#FFF7E0',
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  feedbackChipText: { fontSize: 11, color: COLORS.accentText, fontWeight: '600' },
  transcriptButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  transcriptButtonText: { color: COLORS.accentText, fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
});