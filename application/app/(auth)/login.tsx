import React, { useState } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Common/Button";
import { AuthCard } from "../../src/components/auth/AuthCard";
import { AuthField } from "../../src/components/auth/AuthField";
import { PartnerBrand } from "../../src/components/auth/PartnerBrand";
import { KeyboardAvoidingView } from "react-native";
import {
  AppTheme,
  radii,
  spacing,
  typography,
} from "../../src/constants/colors";
import { useTheme } from "../../src/hooks/useTheme";
import { useAuth } from "../../src/hooks/useAuth";
import { loginDTO } from "../../src/types/trainer.types";

export default function LoginRoute() {
  const { theme } = useTheme();
  const { handleLogin, loading, loginError, success } = useAuth();

  return (
    <LoginScreen
      theme={theme}
      onLogin={(trainer: loginDTO) => {
        handleLogin(trainer);
      }}
      loading={loading}
      error={loginError}
      success={success}
      onSignup={() => router.push("/(auth)/signup")}
    />
  );
}

type LoginScreenProps = {
  theme: AppTheme;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  onLogin: (trainer: loginDTO) => void;
  onSignup?: () => void;
};

export function LoginScreen({ theme, onLogin, onSignup }: LoginScreenProps) {
  const { mode } = useTheme();
  const [inputs, setInputs] = useState({ email: "", pass: "" });
  const [inputError, setInputError] = useState({ email: "", pass: "" });

  const checkInput = () => {
    if (!inputs.email) {
      setInputError({ email: "Please Fill Your Email.", pass: "" });
      return false;
    } else if (!inputs.pass || inputs.pass.length < 6) {
      setInputError({
        email: "",
        pass: "Password Must More Than 5 Characters.",
      });
      return false;
    } else {
      setInputError({ email: "", pass: "" });
    }
    return true;
  };
  const handleLogin = async () => {
    const checked = checkInput();
    if (checked) {
      onLogin({ email: inputs.email, password: inputs.pass });
    }
  };
  return (
    <KeyboardAvoidingView>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { backgroundColor: theme.background },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <PartnerBrand theme={theme} />
        <AuthCard theme={theme}>
          <View style={styles.heading}>
            <Text style={[styles.title, { color: theme.foreground }]}>
              Welcome Back, Partner
            </Text>
            <Text style={[styles.description, { color: theme.muted }]}>
              Access your client roster, bookings &amp; payouts.
            </Text>
          </View>
          <View style={styles.pills}>
            {["Trainer", "Physio", "Nutrition", "Supplier"].map((role) => (
              <View
                key={role}
                style={[
                  styles.pill,
                  { borderColor: theme.border, backgroundColor: theme.input },
                ]}
              >
                <Text style={[styles.pillText, { color: theme.muted }]}>
                  {role}
                </Text>
              </View>
            ))}
          </View>
          <AuthField
            theme={theme}
            label="BUSINESS EMAIL OR PHONE"
            placeholder="partner@bole.fit"
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<Text style={{ color: theme.muted }}>◯</Text>}
          />
          <AuthField
            theme={theme}
            label="PASSWORD"
            placeholder="••••••••••••"
            secureTextEntry
            action={
              <Text style={[styles.link, { color: theme.primary }]}>
                Forgot Password?
              </Text>
            }
            icon={<Text style={{ color: theme.muted }}>▣</Text>}
          />
          <Button
            mode={mode}
            title="LOGIN AS PARTNER  ⚡"
            onPress={handleLogin}
          />
          {/* <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: theme.border }]} />
          <Text style={[styles.or, { color: theme.subtle }]}>
            OR CONTINUE WITH
          </Text>
          <View style={[styles.line, { backgroundColor: theme.border }]} />
        </View>
        <View style={styles.socialRow}>
          <View style={[styles.social, { borderColor: theme.border }]}>
            <Text style={[styles.socialText, { color: theme.foreground }]}>
              G Google
            </Text>
          </View>
          <View style={[styles.social, { borderColor: theme.border }]}>
            <Text style={[styles.socialText, { color: theme.foreground }]}>
               Apple
            </Text>
          </View>
        </View> */}
        </AuthCard>
        <Text style={[styles.footer, { color: theme.muted }]}>
          New gym partner?{" "}
          <Text
            onPress={onSignup}
            style={{ color: theme.primary, fontWeight: "800" }}
          >
            Apply to Join / Sign Up
          </Text>
        </Text>
        <Text style={[styles.ecosystem, { color: theme.subtle }]}>
          — BOLE ELITE ECOSYSTEM • ETHIOPIA —
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.xl,
    marginTop: 40,
  },
  heading: { gap: spacing.xs },
  title: { fontSize: typography.heading, fontWeight: "800" },
  description: { fontSize: typography.body },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pillText: { fontSize: 13 },
  link: { fontWeight: "700", fontSize: 13 },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  line: { height: 1, flex: 1 },
  or: { fontSize: 12, fontWeight: "700" },
  socialRow: { flexDirection: "row", gap: spacing.md },
  social: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  socialText: { fontSize: typography.body, fontWeight: "600" },
  footer: { fontSize: typography.body, textAlign: "center" },
  ecosystem: { fontSize: 11, letterSpacing: 1.6, textAlign: "center" },
});
