// theme.ts
// Tokens de diseño compartidos por toda la pantalla del cliente.
// Inspirado en el rebrand 2021 de Bancoagrícola (blanco/negro + acentos de
// color vibrante), NO son los hex oficiales exactos -- si tienes acceso al
// sitio real, inspecciona y reemplaza ACCENT / TEXT_PRIMARY aquí y el resto
// de los componentes se actualiza solo (todos importan de este archivo).

export const COLORS = {
  background: "#FFFFFF",
  surface: "#F7F7F8",
  header: "#111111",
  headerText: "#FFFFFF",

  textPrimary: "#111111",
  textSecondary: "#6B7280",

  accent: "#FF5A36", // acento vibrante tipo "trazo de color" del rebrand
  accentSoft: "#FFE7DF",

  border: "#E7E7E9",

  botBubble: "#F2F2F3",
  botText: "#111111",

  userBubble: "#111111",
  userText: "#FFFFFF",

  systemBubble: "#FFF6E5",
  systemBorder: "#F0D48A",
  systemText: "#7A5A00",

  cerradaBg: "#111111",
  cerradaText: "#FFFFFF",
  cerradaSubtext: "#B5B5B5",

  error: "#D64545",
  disabled: "#D9D9DC",
};

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const FONT = {
  title: 18,
  subtitle: 13,
  body: 15,
  small: 12,
};