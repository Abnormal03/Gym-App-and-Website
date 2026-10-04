import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { AppTheme, radii, spacing, typography } from "../../constants/colors";

type AuthFieldProps = TextInputProps & {
  theme: AppTheme;
  label: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  shellStyles?: any;
};

export function AuthField({
  theme,
  label,
  icon,
  action,
  style,
  shellStyles,
  ...props
}: AuthFieldProps) {
  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
        {action}
      </View>
      <View
        style={[
          styles.inputShell,
          { backgroundColor: theme.input, borderColor: theme.border },
          shellStyles,
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          {...props}
          placeholderTextColor={theme.subtle}
          style={[styles.input, { color: theme.foreground }, style]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { fontSize: typography.label, fontWeight: "800", letterSpacing: 0.8 },
  inputShell: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  icon: { marginRight: spacing.sm },
  input: { flex: 1, fontSize: typography.body, paddingVertical: 0 },
});
