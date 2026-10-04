import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppTheme, radii, spacing, typography } from "../../constants/colors";
import MaterialIcons from "@react-native-vector-icons/material-icons";

type PartnerBrandProps = {
  theme: AppTheme;
  showPortalLabel?: boolean;
  signup?: boolean;
};

export function PartnerBrand({
  theme,
  showPortalLabel = true,
  signup = false,
}: PartnerBrandProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.logo, { backgroundColor: theme.primary }]}>
        <MaterialIcons name="fitness-center" size={50} />
      </View>
      <Text style={[styles.name, { color: theme.foreground }]}>
        BOLE <Text style={{ color: theme.primary }}>PARTNER</Text>
      </Text>
      <Text style={[styles.eyebrow, { color: theme.muted }]}>
        FITNESS &amp; WELLNESS ECOSYSTEM • ADDIS ABABA
      </Text>
      {signup ? (
        <Text style={[styles.subtitle, { color: theme.foreground }]}>
          Become an{" "}
          <Text style={{ color: theme.primary }}>Official Partner</Text>
        </Text>
      ) : showPortalLabel ? (
        <View
          style={[
            styles.portal,
            { borderColor: theme.border, backgroundColor: theme.input },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: theme.success }]} />
          <Text style={[styles.portalText, { color: theme.primary }]}>
            PARTNER PORTAL
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: spacing.sm },
  logo: {
    width: 76,
    height: 76,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoMark: { color: "#FFFFFF", fontSize: 27, fontWeight: "800" },
  name: { fontSize: typography.title, fontWeight: "800", letterSpacing: -1 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  portal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dot: { width: 8, height: 8, borderRadius: radii.pill },
  portalText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },
  subtitle: { fontSize: 20, fontWeight: "700", marginTop: spacing.xs },
});
