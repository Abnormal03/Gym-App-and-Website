// src/hooks/useTheme.ts
import { useColorScheme } from "react-native";
import { colors, type ThemeMode } from "../constants/colors";
import { useThemeStore, type ThemePreference } from "../store/theme.store";

export const useTheme = () => {
  const scheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const mode: ThemeMode =
    preference === "system"
      ? scheme === "dark"
        ? "dark"
        : "light"
      : preference;

  return {
    theme: colors[mode],
    isDark: mode === "dark",
    mode,
    preference,
    setMode: (nextMode: ThemeMode) => setPreference(nextMode),
    setPreference: (nextPreference: ThemePreference) =>
      setPreference(nextPreference),
  };
};
