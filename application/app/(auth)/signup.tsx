import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/Common/Button";
import { AuthCard } from "../../src/components/auth/AuthCard";
import { AuthField } from "../../src/components/auth/AuthField";
import { PartnerBrand } from "../../src/components/auth/PartnerBrand";
import {
  AppTheme,
  radii,
  spacing,
  typography,
} from "../../src/constants/colors";
import { useTheme } from "../../src/hooks/useTheme";
import MaterialIcons from "@react-native-vector-icons/material-icons";
import { useAuth } from "../../src/hooks/useAuth";
import { PendingTrainer } from "../../src/types/trainer.types";

export default function SignupRoute() {
  const { theme } = useTheme();

  return (
    <SignupScreen
      theme={theme}
      onLogin={() => router.push("/(auth)/login")}
      onSubmit={() => router.replace("/(auth)/trainer-profile")}
    />
  );
}

type SignupScreenProps = {
  theme: AppTheme;
  onSubmit: () => void;
  onLogin?: () => void;
};
const roles = ["Trainer", "Physiotherapist", "Nutritionist", "Gym Supplier"];

export function SignupScreen({ theme, onSubmit, onLogin }: SignupScreenProps) {
  const { mode } = useTheme();
  const { saveProgres, loadProgress } = useAuth();
  const [trainer, setTrainer] = useState<null | PendingTrainer>();

  const [inputError, setInputError] = useState({
    email: "",
    name: "",
    phone: "",
    pass: "",
  });
  const [role, setRole] = useState<string>(trainer?.role || roles[0]);
  const [inputs, setInputs] = useState({
    email: "",
    name: "",
    phone: "+251",
    pass: "",
  });

  useEffect(() => {
    const loadTrainer = async () => {
      try {
        const pendingTrainer = await loadProgress();
        if (!pendingTrainer) return;

        const parsedTrainer: PendingTrainer =
          typeof pendingTrainer === "string"
            ? JSON.parse(pendingTrainer)
            : pendingTrainer;
        setTrainer(parsedTrainer);
      } catch (error) {
        console.error("Error loading trainer from storage:", error);
      }
    };

    loadTrainer();
  }, []);

  useEffect(() => {
    if (trainer) {
      setInputs({
        name: trainer.name || "",
        pass: trainer.password || "",
        phone: trainer.phone || "+251",
        email: trainer.email || "",
      });

      if (trainer.role) {
        setRole(trainer.role);
      }
    }
  }, [trainer]);

  const handleRole = (role: string) => {
    setRole(role);
  };

  const handleSubmit = () => {
    const check = checkInputs();
    if (!check) {
      return;
    }
    saveProgres({
      name: inputs.name,
      email: inputs.email,
      phone: inputs.phone,
      password: inputs.pass,
      role: role,
    });
    onSubmit();
  };

  const checkInputs = () => {
    if (!inputs.name) {
      setInputError({
        email: "",
        phone: "",
        pass: "",
        name: "Name is Mandatory",
      });
      return false;
    } else if (!inputs.email) {
      setInputError({
        email: "Email is Mandatory",
        phone: "",
        pass: "",
        name: "",
      });
      return false;
    } else if (
      !inputs.phone ||
      (!inputs.phone.startsWith("+2519") && !inputs.phone.startsWith("+2517"))
    ) {
      setInputError({
        email: "",
        phone: "Phone is Mandatory and Must Start With +2519 or +2517.",
        pass: "",
        name: "",
      });
      return false;
    } else if (!inputs.pass) {
      setInputError({
        email: "",
        phone: "",
        pass: "password is Mandatory",
        name: "",
      });
      return false;
    } else {
      setInputError({ name: "", pass: "", phone: "", email: "" });
    }

    return true;
  };

  const handleChange = (field: string, value: string) => {
    setInputError({ name: "", pass: "", phone: "", email: "" });
    setInputs((prev) => ({ ...prev, [field]: value }));
  };
  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { backgroundColor: theme.background },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <PartnerBrand theme={theme} signup />
      <AuthCard theme={theme}>
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.muted }]}>
              I AM A / SPECIALTY *
            </Text>
            <Text style={[styles.verified, { color: theme.primary }]}>
              VERIFIED STATUS
            </Text>
          </View>
          <View style={styles.roles}>
            {roles.map((rl, index) => (
              <Pressable
                key={index}
                style={[
                  styles.role,
                  {
                    backgroundColor: theme.input,
                    borderColor: role === rl ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleRole(rl)}
              >
                <Text style={[styles.roleTitle, { color: theme.foreground }]}>
                  {rl}
                </Text>
                <Text style={[styles.roleCaption, { color: theme.muted }]}>
                  {index === 0
                    ? "Coach / PT"
                    : index === 1
                      ? "Rehab & Care"
                      : index === 2
                        ? "Diet & Plans"
                        : "Gear & Supplies"}
                </Text>
                <MaterialIcons
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    fontSize: 20,
                    color: role === rl ? theme.primary : theme.foreground,
                  }}
                  name="arrow-right"
                />
              </Pressable>
            ))}
          </View>
        </View>
        <AuthField
          theme={theme}
          label="FULL NAME / BUSINESS NAME *"
          value={inputs.name}
          shellStyles={{
            borderColor: inputError.name ? theme.error : theme.border,
          }}
          placeholder="e.g. Dawit Haile"
          onChangeText={(e) => handleChange("name", e)}
        />
        <AuthField
          theme={theme}
          label="BUSINESS EMAIL *"
          placeholder="pro@bolepartner.et"
          value={inputs.email}
          shellStyles={{
            borderColor: inputError.email ? theme.error : theme.border,
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={(e) => handleChange("email", e)}
        />
        <AuthField
          theme={theme}
          label="PHONE NUMBER *"
          placeholder="09 / 07..."
          shellStyles={{
            borderColor: inputError.phone ? theme.error : theme.border,
          }}
          keyboardType="phone-pad"
          onChangeText={(e) => handleChange("phone", e)}
          value={inputs.phone}
        />
        <AuthField
          theme={theme}
          label="CREATE PASSWORD *"
          placeholder="••••••••••••"
          value={inputs.pass}
          shellStyles={{
            borderColor: inputError.pass ? theme.error : theme.border,
          }}
          secureTextEntry
          action={
            <Text style={[styles.verified, { color: theme.success }]}>
              SECURITY: STRONG
            </Text>
          }
          onChangeText={(e) => handleChange("pass", e)}
        />
        {/* <View style={styles.terms}>
          <View style={[styles.checkbox, { borderColor: theme.border }]} />
          <Text style={[styles.termsText, { color: theme.muted }]}>
            I agree to the{" "}
            <Text style={{ color: theme.primary }}>Terms of Service</Text> &amp;{" "}
            <Text style={{ color: theme.primary }}>Verification Policy</Text>.
          </Text>
        </View> */}
        {(inputError?.name ||
          inputError.email ||
          inputError.pass ||
          inputError.phone) && (
          <View
            style={{
              width: 300,
              alignItems: "center",
            }}
          >
            <Text style={{ color: theme.error }}>
              {inputError.name ||
                inputError.email ||
                inputError.pass ||
                inputError.phone}
            </Text>
          </View>
        )}
        <Button mode={mode} title="NEXT" onPress={handleSubmit} />
        <Text style={[styles.footer, { color: theme.muted }]}>
          Already a partner?{" "}
          <Text
            onPress={onLogin}
            style={{ color: theme.primary, fontWeight: "800" }}
          >
            Login
          </Text>
        </Text>
      </AuthCard>
      <Text style={[styles.ecosystem, { color: theme.subtle }]}>
        ADDIS ABABA • BOLE ELITE ECOSYSTEM
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  buttonText: {
    fontSize: 0,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.lg,
  },
  section: { gap: spacing.md },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: typography.label, fontWeight: "800", letterSpacing: 0.8 },
  verified: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  role: {
    width: "48%",
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 3,
  },
  roleTitle: { fontSize: 14, fontWeight: "700" },
  roleCaption: { fontSize: 11 },
  terms: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderRadius: 4 },
  termsText: { flex: 1, fontSize: 12, lineHeight: 18 },
  footer: { textAlign: "center", fontSize: 13 },
  ecosystem: { fontSize: 11, letterSpacing: 1.4, textAlign: "center" },
});
