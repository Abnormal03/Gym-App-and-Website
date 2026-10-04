export type ThemePalette = {
  background: string;
  foreground: string;
  card: string;
  input: string;
  border: string;
  muted: string;
  subtle: string;
  primary: string;
  primaryHover: string;
  success: string;
  error: string;
};

export const colors: Record<string, ThemePalette> = {
  light: {
    background: "#F8F7FC",
    foreground: "#171827",
    card: "#FFFFFF",
    input: "#F3F1FC",
    border: "#C9C9DA",
    muted: "#64677F",
    subtle: "#A9AABA",
    primary: "#2E68F4",
    primaryHover: "#1E56DD",
    success: "#00855E",
    error: "#eb3434",
  },
  dark: {
    background: "#070A0F",
    foreground: "#F7F7FA",
    card: "#171C23",
    input: "#030508",
    border: "#303744",
    muted: "#A1A4B5",
    subtle: "#626778",
    primary: "#2E68F4",
    primaryHover: "#4B7DFF",
    success: "#00D99A",
    error: "#eb3434",
  },
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
};

export const typography = {
  title: 30,
  heading: 24,
  body: 16,
  label: 12,
  caption: 13,
};

export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
};

export type ThemeSpacing = typeof spacing;
export type ThemeRadii = typeof radii;
export type ThemeTypography = typeof typography;
export type ThemeMode = keyof typeof colors;
export type AppTheme = ThemePalette;
export const getTheme = (mode: ThemeMode): AppTheme => colors[mode];
