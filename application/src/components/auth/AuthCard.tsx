import React from "react";
import { StyleSheet, View } from "react-native";
import { AppTheme, radii, shadows, spacing } from "../../constants/colors";

type AuthCardProps = { theme: AppTheme; children: React.ReactNode };

export function AuthCard({ theme, children }: AuthCardProps) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadows.card,
  },
});
