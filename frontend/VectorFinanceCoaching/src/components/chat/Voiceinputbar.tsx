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
  // true mientras el audio del bot esta sonando. Bloquea el mic Y el
  // input de texto -- ya no hay boton de Enviar, así que el único otro
  // camino para mandar un mensaje es onSubmitEditing (tecla Enter/Return),
  // que tampoco dispara si el input no es editable.
  deshabilitadoPorAudio?: boolean;
};

// Barra de input pensada para "llamada": el micrófono es la acción
// principal (más grande, con acento), el texto es la alternativa
// secundaria -- se envía con Enter/Return, sin botón de Enviar aparte
// (se quitó para reducir superficie de casos raros: un tap al Enviar
// justo cuando cargando/hablando estaban a punto de cambiar). El bloqueo
// por cierre de conversación lo maneja el padre (ChatScreen) reemplazando
// este componente por CallEndedBanner, no deshabilitándolo aquí.
export default function VoiceInputBar({
  value,
  onChangeText,
  onSend,
  onVoicePress,
  escuchando,
  cargando,
  deshabilitadoPorAudio = false,
}: Props) {
  const bloqueado = cargando || deshabilitadoPorAudio;

  return (
    <View style={styles.inputRow}>
      <TouchableOpacity
        style={[styles.micButton, escuchando && styles.micButtonActivo, bloqueado && styles.disabled]}
        onPress={onVoicePress}
        disabled={bloqueado}
        accessibilityLabel={deshabilitadoPorAudio ? "Micrófono deshabilitado mientras el bot habla" : "Hablar"}
      >
        <Text style={styles.micIcon}>{escuchando ? "●" : "🎤"}</Text>
      </TouchableOpacity>

      <TextInput
        style={[styles.input, bloqueado && styles.disabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder="O escribe tu mensaje..."
        placeholderTextColor={COLORS.textSecondary}
        editable={!bloqueado}
        onSubmitEditing={onSend}
      />
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
    color: COLORS.textPrimary,
  },
  disabled: { backgroundColor: COLORS.disabled },
});