import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { ThemeMode } from "../../constants/colors";
type Props = ActivityIndicatorProps & { mode: ThemeMode };
export function LoadingSpinner({ mode, color, ...props }: Props) {
  const { theme } = useTheme();
  return (
    <ActivityIndicator
      accessibilityLabel="Loading"
      color={color ?? theme.primary}
      {...props}
    />
  );
}
