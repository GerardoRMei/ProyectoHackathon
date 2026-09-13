// theme.ts
// Paleta del PANEL INTERNO (banco) -- a propósito distinta a la del chat
// del cliente (components/chat/theme.ts), porque son 2 productos para 2
// audiencias distintas, no la misma app.
//
// El amarillo se mantiene como el color histórico "de confianza" del
// Grupo Bancolombia/Bancoagrícola -- lo conservaron incluso después de su
// rebrand 2021 a blanco/negro. Este hex es una aproximación razonable, no
// el Pantone oficial exacto -- ajústalo si lo confirman.

export const COLORS = {
  bgDark: '#0F172A',
  bgDarkAlt: '#1E293B',
  bgLight: '#F1F5F9',
  surface: '#FFFFFF',
  border: '#E2E8F0',

  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: '#94A3B8',

  accent: '#FFC72C', // amarillo "de confianza" del banco
  accentText: '#3F2E00', // texto oscuro legible sobre fondo amarillo

  success: { bg: '#DCFCE7', border: '#86EFAC', text: '#166534' },
  warning: { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },
  info: { bg: '#E0E7FF', border: '#A5B4FC', text: '#3730A3' },
  neutral: { bg: '#F1F5F9', border: '#CBD5E1', text: '#334155' },
} as const;

export type ThemeColors = typeof COLORS;
export type StatusType = 'success' | 'warning' | 'info' | 'neutral';
export type StatusColor = typeof COLORS[StatusType];