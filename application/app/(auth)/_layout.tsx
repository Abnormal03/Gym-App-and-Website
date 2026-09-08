import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Stack } from "expo-router";
import { type ThemeMode } from "../../src/constants/colors";

type AuthThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const AuthThemeContext = createContext<AuthThemeContextValue | undefined>(
  undefined,
);

export function useAuthTheme() {
  const context = useContext(AuthThemeContext);

  if (!context) {
    throw new Error("useAuthTheme must be used inside the auth layout");
  }

  return context;
}

export default function AuthLayout() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const theme = useMemo(() => ({ mode, setMode }), [mode]);

  return (
    <AuthThemeContext.Provider value={theme}>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthThemeContext.Provider>
  );
}
