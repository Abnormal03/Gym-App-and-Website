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
    background: '#F8F7FC',
    foreground: '#171827',
    card: '#FFFFFF',
    input: '#F3F1FC',
    border: '#C9C9DA',
    muted: '#64677F',
    subtle: '#A9AABA',
    primary: '#2E68F4',
    primaryHover: '#1E56DD',
    success: '#00855E',
    error: '#eb3434',
  },
  dark: {
    background: '#070A0F',
    foreground: '#F7F7FA',
    card: '#171C23',
    input: '#030508',
    border: '#303744',
    muted: '#A1A4B5',
    subtle: '#626778',
    primary: '#2E68F4',
    primaryHover: '#4B7DFF',
    success: '#00D99A',
    error: '#eb3434',
  },
};

export type ThemeMode = keyof typeof colors;
export type AppTheme = ThemePalette;