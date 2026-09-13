import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { COLORS } from '../app/screens/dashboard/theme';
import { Registro, TurnoTranscripcion } from './Types';

const VELOCIDAD_MS = 900; // tiempo entre turnos en modo "reproducir"

// "Cliente: hola\nCopiloto: buenas tardes" -> [{rol: 'Cliente', texto: 'hola'}, ...]
function parsearTranscripcion(texto?: string | null): TurnoTranscripcion[] {
  if (!texto) return [];
  return texto
    .split('\n')
    .filter(Boolean)
    .map((linea) => {
      const idx = linea.indexOf(':');
      if (idx === -1) return { rol: 'Copiloto', texto: linea };
      return {
        rol: linea.slice(0, idx).trim(),
        texto: linea.slice(idx + 1).trim(),
      };
    });
}

interface BurbujaProps {
  turno: TurnoTranscripcion;
}

function Burbuja({ turno }: BurbujaProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const esCliente = turno.rol === 'Cliente';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.burbujaFila,
        { justifyContent: esCliente ? 'flex-start' : 'flex-end' },
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View
        style={[
          styles.burbuja,
          esCliente ? styles.burbujaCliente : styles.burbujaCopiloto,
        ]}
      >
        <Text style={styles.burbujaRol}>{turno.rol}</Text>
        <Text
          style={[
            styles.burbujaTexto,
            { color: esCliente ? COLORS.textPrimary : COLORS.textOnDark },
          ]}
        >
          {turno.texto}
        </Text>
      </View>
    </Animated.View>
  );
}

interface TranscriptReplayProps {
  visible: boolean;
  registro: Registro | null;
  onClose: () => void;
}

export default function TranscriptReplay({
  visible,
  registro,
  onClose,
}: TranscriptReplayProps) {
  const turnos = useMemo(
    () => parsearTranscripcion(registro?.transcripcion),
    [registro]
  );
  const [indiceVisible, setIndiceVisible] = useState<number>(0);
  const [reproduciendo, setReproduciendo] = useState<boolean>(false);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // reinicia el replay cada vez que se abre un registro distinto
  useEffect(() => {
    setIndiceVisible(0);
    setReproduciendo(false);
  }, [registro]);

  useEffect(() => {
    if (!reproduciendo) return;
    if (indiceVisible >= turnos.length) {
      setReproduciendo(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      setIndiceVisible((i) => i + 1);
    }, VELOCIDAD_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reproduciendo, indiceVisible, turnos.length]);

  const terminado = indiceVisible >= turnos.length;

  const handlePlayPause = () => {
    if (terminado) {
      setIndiceVisible(0);
      setReproduciendo(true);
    } else {
      setReproduciendo((r) => !r);
    }
  };

  const handleSiguientePaso = () => {
    setReproduciendo(false);
    setIndiceVisible((i) => Math.min(i + 1, turnos.length));
  };

  if (!registro) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>Transcripción</Text>
            <Text style={styles.headerTitle}>
              Sesión {registro.sesion_id.slice(0, 8)}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cerrar}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {turnos.slice(0, indiceVisible).map((turno, i) => (
            <Burbuja key={i} turno={turno} />
          ))}
          {turnos.length === 0 && (
            <Text style={styles.sinTranscripcion}>
              No hay transcripción disponible para esta sesión.
            </Text>
          )}
        </ScrollView>

        <View style={styles.controles}>
          <TouchableOpacity style={styles.botonSecundario} onPress={handleSiguientePaso}>
            <Text style={styles.botonSecundarioTexto}>Paso a paso</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botonPrincipal} onPress={handlePlayPause}>
            <Text style={styles.botonPrincipalTexto}>
              {terminado ? '↻ Repetir' : reproduciendo ? '⏸ Pausar' : '▶ Reproducir'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgDarkAlt,
  },
  headerEyebrow: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: { color: COLORS.textOnDark, fontSize: 16, fontWeight: '700', marginTop: 2 },
  cerrar: { color: COLORS.textOnDarkMuted, fontSize: 14, fontWeight: '600' },
  chatArea: { flex: 1, backgroundColor: COLORS.bgLight },
  burbujaFila: { flexDirection: 'row', marginBottom: 10 },
  burbuja: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  burbujaCliente: {
    backgroundColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },
  burbujaCopiloto: {
    backgroundColor: COLORS.bgDark,
    borderBottomRightRadius: 4,
  },
  burbujaRol: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    opacity: 0.7,
    color: '#334155',
  },
  burbujaTexto: { fontSize: 14, lineHeight: 19 },
  sinTranscripcion: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  controles: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 30,
    backgroundColor: COLORS.bgDark,
  },
  botonSecundario: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.bgDarkAlt,
    alignItems: 'center',
  },
  botonSecundarioTexto: { color: COLORS.textOnDarkMuted, fontWeight: '600' },
  botonPrincipal: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  botonPrincipalTexto: { color: COLORS.accentText, fontWeight: '700' },
});