// src/hooks/useTheme.ts
import { useColorScheme } from 'react-native';
import { colors, ThemeMode } from '../../src/constants/colors';

export const useTheme = () => {
    const scheme = useColorScheme();
    const mode: ThemeMode = scheme === 'dark' ? 'dark' : 'light';
    return {
        theme: colors[mode],
        isDark: mode === 'dark',
        mode,
    };
};