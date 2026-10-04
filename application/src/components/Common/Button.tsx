import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from "react-native";
import { type ThemeMode } from "../../constants/colors";
import { useTheme } from "../../hooks/useTheme";

type Props = PressableProps & {
  mode: ThemeMode;
  title: string;
  loading?: boolean;
  variant?: "primary" | "outline";
};
export function Button({
  mode,
  title,
  loading = false,
  variant = "primary",
  disabled,
  style,
  ...props
}: Props) {
  const { theme } = useTheme();
  const p = theme;
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.base,
        {
          backgroundColor: primary ? p.primary : "transparent",
          borderColor: p.border,
          opacity: pressed ? 0.82 : disabled || loading ? 0.55 : 1,
        },
        primary ? s.primary : s.outline,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={primary ? "#fff" : p.foreground} />
      ) : (
        <Text style={[s.text, { color: primary ? "#fff" : p.foreground }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
const s = StyleSheet.create({
  base: {
    minHeight: 68,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primary: {
    borderWidth: 0,
    shadowColor: "#2E68F4",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  outline: {},
  text: { fontSize: 20, fontWeight: "800" },
});
