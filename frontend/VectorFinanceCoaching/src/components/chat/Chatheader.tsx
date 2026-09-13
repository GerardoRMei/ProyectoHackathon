import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, FONT, SPACING } from "./theme";

type Props = {
  debug?: string | null;
  onDashboardPress: () => void;
  onReiniciarPress: () => void;
};

// Header pensado para sentirse "dentro" de la banca en línea del banco:
// wordmark a la izquierda, subtítulo del producto, y accesos rápidos a la
// derecha como iconos discretos (no como links subrayados de web).
export default function ChatHeader({ debug, onDashboardPress, onReiniciarPress }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.marca}>
        <Text style={styles.wordmark}>bancoagrícola</Text>
        <Text style={styles.subtitle}>Copiloto de Salud Financiera</Text>
        {debug ? <Text style={styles.debug}>{debug}</Text> : null}
      </View>

      <View style={styles.acciones}>
        <TouchableOpacity onPress={onDashboardPress} style={styles.iconButton} accessibilityLabel="Ver dashboard">
          <Text style={styles.iconText}>📊</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onReiniciarPress} style={styles.iconButton} accessibilityLabel="Reiniciar conversación">
          <Text style={styles.iconText}>↺</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.header,
    paddingTop: 16,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  marca: { flexShrink: 1 },
  wordmark: {
    color: COLORS.headerText,
    fontSize: FONT.title,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  subtitle: {
    color: COLORS.accent,
    fontSize: FONT.subtitle,
    fontWeight: "600",
    marginTop: 2,
  },
  debug: {
    color: "#8A8A8E",
    fontSize: FONT.small,
    marginTop: 2,
  },
  acciones: { flexDirection: "row", gap: SPACING.sm },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SPACING.sm,
  },
  iconText: { fontSize: 16 },
});