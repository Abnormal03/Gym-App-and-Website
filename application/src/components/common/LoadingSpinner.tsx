import { ActivityIndicator, type ActivityIndicatorProps } from "react-native";
import { colors, type ThemeMode } from "../../constants/colors";
type Props = ActivityIndicatorProps & { mode: ThemeMode };
export function LoadingSpinner({ mode, color, ...props }: Props) {
  return (
    <ActivityIndicator
      accessibilityLabel="Loading"
      color={color ?? colors[mode].primary}
      {...props}
    />
  );
}
