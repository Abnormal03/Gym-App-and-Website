import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, type ThemeMode } from "../../constants/colors";
type Props = ViewProps & { mode: ThemeMode };
export function Card({ mode, style, ...props }: Props) {
  const p = colors[mode];
  return (
    <View
      style={[
        s.card,
        { backgroundColor: p.card, borderColor: p.border },
        style,
      ]}
      {...props}
    />
  );
}
const s = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 510,
    borderWidth: 1,
    borderRadius: 17,
    padding: 36,
    shadowColor: "#15182A",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
});
