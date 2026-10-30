export type ThemePalette = {
  background: string;
  foreground: string;
  card: string;
  input: string;
  border: string;
  skeleton: string;
  muted: string;
  subtle: string;
  primary: string;
  primaryHover: string;
  success: string;
  error: string;
};

export const colors: Record<string, ThemePalette> = {
  light: {
    background: '#F4F6FB',
    foreground: '#111827',
    card: '#FFFFFF',
    input: '#FFFFFF',
    border: '#DFE5EF',
    skeleton: '#DEE5F0',
    muted: '#647084',
    subtle: '#A9B2C1',
    primary: '#2854E8',
    primaryHover: '#1F47CD',
    success: '#00855E',
    error: '#F06461',
  },
  dark: {
    background: '#0B0F16',
    foreground: '#F1F4FA',
    card: '#141B26',
    input: '#141B26',
    border: '#263244',
    skeleton: '#222C3B',
    muted: '#9AA6B8',
    subtle: '#626F82',
    primary: '#3D62F2',
    primaryHover: '#5576FF',
    success: '#00D99A',
    error: '#FF8279',
  },
};

export type ThemeMode = keyof typeof colors;
export type AppTheme = ThemePalette;
