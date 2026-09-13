import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, SPACING } from "./theme";

// Reemplaza POR COMPLETO la barra de input cuando la conversación se
// cierra -- nunca se deja el mic/input solo "en gris", para que en la
// demo no quede ambigüedad de que ya no se puede seguir hablando.
export default function CallEndedBanner() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📞</Text>
      <Text style={styles.titulo}>Llamada finalizada</Text>
      <Text style={styles.subtitulo}>
        Gracias por tu tiempo. Usa el ↺ de arriba para probar otro caso.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: SPACING.lg + 2,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.cerradaBg,
  },
  icon: { fontSize: 22, marginBottom: 4 },
  titulo: { fontSize: FONT.body, fontWeight: "700", color: COLORS.cerradaText },
  subtitulo: {
    fontSize: FONT.small,
    color: COLORS.cerradaSubtext,
    textAlign: "center",
    marginTop: 4,
  },
});