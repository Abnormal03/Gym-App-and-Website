import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { colors, type ThemeMode } from "../../constants/colors";

type Props = TextInputProps & {
  mode: ThemeMode;
  label: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
};
export function Input({ mode, label, icon, right, style, ...props }: Props) {
  const p = colors[mode];
  return (
    <View style={s.wrap}>
      <Text style={[s.label, { color: p.muted }]}>{label}</Text>
      <View
        style={[s.control, { backgroundColor: p.input, borderColor: p.border }]}
      >
        {icon}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={p.muted + "99"}
          style={[s.input, { color: p.foreground }, style]}
          {...props}
        />
        {right}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { marginBottom: 22 },
  label: {
    fontFamily: "monospace",
    fontWeight: "700",
    letterSpacing: 2,
    fontSize: 15,
    marginBottom: 8,
  },
  control: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingHorizontal: 17,
  },
  input: { flex: 1, fontSize: 20 },
});
