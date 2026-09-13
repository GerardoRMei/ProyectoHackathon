import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "./theme";

export type Mensaje = {
  id: string;
  autor: "bot" | "usuario" | "sistema";
  texto: string;
};

export default function ChatBubble({ mensaje }: { mensaje: Mensaje }) {
  const esUsuario = mensaje.autor === "usuario";
  const esSistema = mensaje.autor === "sistema";

  return (
    <View
      style={[
        styles.bubble,
        esUsuario ? styles.bubbleUsuario : esSistema ? styles.bubbleSistema : styles.bubbleBot,
      ]}
    >
      <Text style={esUsuario ? styles.textoUsuario : esSistema ? styles.textoSistema : styles.textoBot}>
        {mensaje.texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "82%",
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  bubbleBot: {
    backgroundColor: COLORS.botBubble,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  bubbleUsuario: {
    backgroundColor: COLORS.userBubble,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  bubbleSistema: {
    backgroundColor: COLORS.systemBubble,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: COLORS.systemBorder,
  },
  textoBot: { color: COLORS.botText, fontSize: FONT.body },
  textoUsuario: { color: COLORS.userText, fontSize: FONT.body },
  textoSistema: { color: COLORS.systemText, fontSize: FONT.small, textAlign: "center" },
});