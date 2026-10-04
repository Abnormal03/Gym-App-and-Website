import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { Button } from "../Common/Button";
import { Card } from "../Common/Card";
import { Input } from "../Common/Input";
import { LoadingSpinner } from "../Common/LoadingSpinner";
import { radii, spacing, typography } from "../../constants/colors";
import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "expo-router";
import MaterialIcons from "@react-native-vector-icons/material-icons";
import { PendingTrainer } from "../../types/trainer.types";

type Props = {
  onContinue: () => void;
  loading?: boolean;
};
const specializations = [
  "Strength & Conditioning",
  "Weight Loss & HIIT",
  "Hypertrophy / Bodybuilding",
  "Functional Mobility",
  "Boxing & Combat",
  "Pre / Post Natal",
];

export function TrainerProfileForm({ onContinue }: Props) {
  const { theme, mode } = useTheme();
  const [specialization, setSpecialization] = useState(specializations[0]);
  const [experience, setExperience] = useState(1);
  const [certifications, setCertifications] = useState("");
  const [bio, setBio] = useState("");
  const bioCount = useMemo(() => bio.length, [bio]);
  const router = useRouter();
  const [trainer, setTrainer] = useState<PendingTrainer | null>(null);

  const { loadProgress, handleRegister, loading, loginError, success } =
    useAuth();

  useEffect(() => {
    const fetchTrainer = async () => {
      const pendingTrainer = await loadProgress();
      if (!pendingTrainer) {
        return router.replace("/(auth)/signup");
      }
      setTrainer(JSON.parse(pendingTrainer));
    };

    fetchTrainer();
  }, []);

  const handleSubmit = async () => {
    if (!trainer) {
      return;
    }
    await handleRegister({
      bio,
      experienceYears: experience,
      specialization,
      ...trainer,
    });

    if (!loginError && success) {
      onContinue();
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.back, { borderColor: theme.border }]}
          onPress={() => router.replace("/(auth)/signup")}
        >
          <Text style={[styles.backText, { color: theme.foreground }]}>
            <MaterialIcons name="arrow-back" size={25} />
          </Text>
        </Pressable>
        <View
          style={{
            backgroundColor: theme.primary,
            padding: 10,
            borderRadius: "50%",
          }}
        >
          <MaterialIcons name="fitness-center" size={50} />
        </View>
        <View
          style={[
            styles.step,
            { borderColor: theme.primary, backgroundColor: theme.primary },
          ]}
        >
          <Text style={{ color: theme.card }}>• STEP 2/3</Text>
        </View>
      </View>
      <View style={styles.heading}>
        <View style={styles.badges}>
          <Text
            style={[
              styles.badge,
              { color: theme.foreground, borderColor: theme.border },
            ]}
          >
            TRAINER / COACH
          </Text>
          <Text
            style={[
              styles.badge,
              { color: theme.success, borderColor: theme.success },
            ]}
          >
            PRO VERIFICATION
          </Text>
        </View>
        <Text style={[styles.title, { color: theme.foreground }]}>
          Complete Your Trainer Profile
        </Text>
      </View>
      <Card mode={mode} style={styles.formCard}>
        <Text style={[styles.sectionLabel, { color: theme.foreground }]}>
          PRIMARY SPECIALIZATION <Text style={{ color: theme.primary }}>*</Text>
        </Text>
        <View style={styles.chips}>
          {specializations.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              onPress={() => setSpecialization(item)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    specialization === item ? theme.primary : theme.input,
                  borderColor:
                    specialization === item ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={{
                  color: specialization === item ? "#FFF" : theme.foreground,
                  fontWeight: "700",
                }}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
        <Input
          mode={mode}
          label="ADDITIONAL CERTIFICATIONS"
          placeholder="e.g. NASM-CPT, ACE, CSCS, CrossFit L2"
          value={certifications}
          onChangeText={setCertifications}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Text style={[styles.sectionLabel, { color: theme.foreground }]}>
          YEARS OF COACHING EXPERIENCE
        </Text>

        <TextInput
          value={String(experience)}
          onChangeText={(e) => setExperience(Number(e))}
          style={{
            flex: 1,
            backgroundColor: theme.background,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 10,
            height: 50,
            paddingLeft: 45,
            width: 100,
            color: theme.foreground,
          }}
          keyboardType="numbers-and-punctuation"
        />
        <Text style={[styles.helper, { color: theme.muted }]}>
          ✓ Verified background builds direct trust with premium private gym
          clients.
        </Text>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.labelRow}>
          <Text style={[styles.sectionLabel, { color: theme.foreground }]}>
            PROFESSIONAL BIO
          </Text>
          <Text style={{ color: theme.muted }}>{bioCount} / 500</Text>
        </View>
        <TextInput
          multiline
          maxLength={500}
          value={bio}
          onChangeText={setBio}
          placeholder="Say Something About Your Self..."
          style={[
            styles.bio,
            {
              color: theme.foreground,
              backgroundColor: theme.input,
              borderColor: theme.border,
            },
          ]}
          placeholderTextColor={theme.muted}
        />
      </Card>
      {loginError && (
        <Text
          style={{
            color: theme.error,
            fontSize: 18,
            textAlign: "center",
            margin: -10,
          }}
        >
          {loginError}
        </Text>
      )}
      <Button
        mode={mode}
        title={loading ? "SAVING PROFILE" : "CONTINUE"}
        loading={loading}
        onPress={handleSubmit}
      />
      <Text style={[styles.footer, { color: theme.muted }]}>
        • Bole Elite Partner Network • Addis Ababa, Ethiopia
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    marginTop: 25,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 34, lineHeight: 38 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    color: "#FFF",
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "800",
  },
  step: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontWeight: "800",
  },
  heading: { gap: spacing.md },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  badge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontWeight: "800",
  },
  title: { fontSize: typography.title, fontWeight: "900" },
  formCard: { gap: spacing.lg },
  sectionLabel: {
    fontSize: typography.label,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  divider: { height: 1 },
  experience: { flexDirection: "row", gap: spacing.sm },
  experienceCard: {
    flex: 1,
    minHeight: 76,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  years: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  helper: { fontSize: typography.caption, lineHeight: 20 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bio: {
    minHeight: 145,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: typography.body,
    lineHeight: 24,
    textAlignVertical: "top",
  },
  footer: {
    textAlign: "center",
    fontSize: typography.caption,
    paddingBottom: spacing.md,
  },
});
