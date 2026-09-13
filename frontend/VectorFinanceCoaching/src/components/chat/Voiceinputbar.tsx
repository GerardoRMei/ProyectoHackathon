import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { COLORS, RADIUS, SPACING } from "./theme";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  onVoicePress: () => void;
  escuchando: boolean;
  cargando: boolean;
};

// Barra de input pensada para "llamada": el micrófono es la acción
// principal (más grande, con acento), el texto es la alternativa
// secundaria. Todo se deshabilita junto con `cargando` -- el bloqueo por
// cierre de conversación lo maneja el padre (ChatScreen) reemplazando este
// componente por CallEndedBanner, no deshabilitándolo aquí.
export default function VoiceInputBar({
  value,
  onChangeText,
  onSend,
  onVoicePress,
  escuchando,
  cargando,
}: Props) {
  return (
    <View style={styles.inputRow}>
      <TouchableOpacity
        style={[styles.micButton, escuchando && styles.micButtonActivo, cargando && styles.disabled]}
        onPress={onVoicePress}
        disabled={cargando}
        accessibilityLabel="Hablar"
      >
        <Text style={styles.micIcon}>{escuchando ? "●" : "🎤"}</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="O escribe tu mensaje..."
        placeholderTextColor={COLORS.textSecondary}
        editable={!cargando}
        onSubmitEditing={onSend}
      />

      <TouchableOpacity
        style={[styles.sendButton, (cargando || !value.trim()) && styles.disabled]}
        onPress={onSend}
        disabled={cargando || !value.trim()}
      >
        <Text style={styles.sendButtonText}>Enviar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: "center",
  },
  micButton: {
    backgroundColor: COLORS.header,
    borderRadius: RADIUS.pill,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  micButtonActivo: {
    backgroundColor: COLORS.accent,
  },
  micIcon: { fontSize: 18, color: "#fff" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    marginRight: SPACING.sm,
    color: COLORS.textPrimary,
  },
  sendButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    justifyContent: "center",
    height: 44,
  },
  sendButtonText: { color: "#fff", fontWeight: "600" },
  disabled: { backgroundColor: COLORS.disabled },
});