export const LIGHT_COLORS = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#EFF6FF",
  background: "#F8FAFC",
  card: "#FFFFFF",
  surfaceSecondary: "#F1F5F9",
  text: "#0F172A",
  secondary: "#64748B",
  border: "#E2E8F0",
  success: "#16A34A",
  successLight: "#F0FDF4",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  purple: "#7C3AED",
  purpleLight: "#F5F3FF",
  orange: "#EA580C",
  orangeLight: "#FFF7ED",
  grayFill: "#F1F5F9",
  muted: "#F8FAFC",
};

export const DARK_COLORS = {
  primary: "#3B82F6",
  primaryDark: "#60A5FA",
  primaryLight: "#1E2B44",
  background: "#080B11",        // True pitch dark base background
  card: "#121826",              // Elevated card surface with distinct contrast
  surfaceSecondary: "#182236",  // Sub-section container (clearly distinguishable from card)
  text: "#F1F5F9",              // Bright, high-contrast headings & primary text
  secondary: "#94A3B8",          // Readable silver-gray for subtitles and metadata
  border: "#253450",            // Crisp, defined border separating cards and sections
  success: "#22C55E",
  successLight: "#052E16",
  danger: "#EF4444",
  dangerLight: "#450A0A",
  warning: "#F59E0B",
  warningLight: "#451A03",
  purple: "#A855F7",
  purpleLight: "#2E1065",
  orange: "#F97316",
  orangeLight: "#431407",
  grayFill: "#1D283E",          // Inputs, search bars, pill controls
  muted: "#121826",
};

export type ThemeColors = typeof LIGHT_COLORS;
export type ThemeMode = "light" | "dark";

export const COLORS: ThemeColors = { ...LIGHT_COLORS };

export function applyTheme(mode: ThemeMode) {
  Object.assign(COLORS, mode === "dark" ? DARK_COLORS : LIGHT_COLORS);
}


