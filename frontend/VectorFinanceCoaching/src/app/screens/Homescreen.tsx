import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../../components/chat/theme";

type Props = {
  onComenzar: () => void;
  onVerDashboard: () => void;
};

// Pantalla de entrada: el tap en "Comenzar" es el gesto de usuario que
// Chrome exige antes de permitir speechSynthesis -- no arrancamos el chat
// solos al montar el componente.
export default function WelcomeScreen({ onComenzar, onVerDashboard }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>bancoagrícola</Text>
      <View style={styles.card}>
        <Text style={styles.icon}>💬</Text>
        <Text style={styles.titulo}>Copiloto de Salud Financiera</Text>
        <Text style={styles.subtitulo}>
          Habla con Archie, tu coach financiero, sobre tu próximo pago.
        </Text>
        <TouchableOpacity style={styles.botonPrimario} onPress={onComenzar}>
          <Text style={styles.botonPrimarioTexto}>Comenzar</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onVerDashboard} style={styles.linkDashboard}>
        <Text style={styles.linkDashboardTexto}>Ver panel interno (banco) →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.header,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  wordmark: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  icon: { fontSize: 28, marginBottom: SPACING.sm },
  titulo: {
    fontSize: FONT.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  subtitulo: {
    fontSize: FONT.subtitle,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  botonPrimario: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    width: "100%",
    alignItems: "center",
  },
  botonPrimarioTexto: { color: "#fff", fontWeight: "700", fontSize: FONT.body },
  linkDashboard: { marginTop: SPACING.xl },
  linkDashboardTexto: { color: "#B5B5B5", fontSize: FONT.small, textDecorationLine: "underline" },
});