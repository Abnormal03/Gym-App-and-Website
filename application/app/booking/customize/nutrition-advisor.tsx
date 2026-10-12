import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../src/components/common/Button";
import { ScreenHeader } from "../../../src/components/common/ScreenHeader";
import { useTheme } from "../../../src/hooks/useTheme";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useBookingStore } from "../../../src/store/booking.store";

type Trainer = {
  id: number;
  name: string;
  rating: number;
  experienceYears: number | null;
  specialization: string | null;
  profilePhotoUrl: string | null;
  sessionPrice: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
};

const advisor: Trainer = {
  id: 8,
  name: "Nutrition Advisor",
  rating: 4.9,
  experienceYears: null,
  specialization: "Nutrition",
  profilePhotoUrl: null,
  sessionPrice: "700.00",
  verificationStatus: "VERIFIED",
};

export default function NutritionAdvisorPage() {
  const { theme, mode } = useTheme();
  const gymName = useBookingStore((state) => state.gymName);
  const saveNutritionChoice = useBookingStore(
    (state) => state.saveNutritionChoice,
  );
  const nutritionSkipped = useBookingStore((state) => state.nutritionSkipped);
  const clearNutritionChoice = useBookingStore(
    (state) => state.clearNutritionChoice,
  );

  const router = useRouter();
  const handleNutritionSelection = async (enabled: boolean) => {
    try {
      if (enabled) {
        await saveNutritionChoice({
          id: advisor.id,
          name: advisor.name,
          price: Number(advisor.sessionPrice),
        });
      } else {
        await clearNutritionChoice();
      }
    } catch (error) {
      Alert.alert(
        "Unable to update nutrition choice",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const handleFinalize = async () => {
    try {
      await saveNutritionChoice({
        id: advisor.id,
        name: advisor.name,
        price: Number(advisor.sessionPrice),
      });
      router.push("/booking/new");
    } catch (error) {
      Alert.alert(
        "Unable to save nutrition choice",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const handleSkip = async () => {
    try {
      await clearNutritionChoice();
      router.push("/booking/new");
    } catch (error) {
      Alert.alert(
        "Unable to remove nutrition choice",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="Customize Session" />

          <View style={styles.locationRow}>
            <View
              style={[styles.locationDot, { backgroundColor: theme.success }]}
            />
            <Text style={[styles.location, { color: theme.muted }]}>
              {gymName ?? "Selected gym"}
            </Text>
          </View>

          <Text style={[styles.title, { color: theme.foreground }]}>
            Add Nutrition Advisor
          </Text>

          {
            <View
              style={[styles.advisorCard, { backgroundColor: theme.input }]}
            >
              <View style={styles.advisorDetails}>
                <Text style={[styles.advisorName, { color: theme.foreground }]}>
                  {advisor.name}
                  {advisor.verificationStatus === "VERIFIED" ? "  ◆" : ""}
                </Text>
                <Text style={[styles.planSubtitle, { color: theme.muted }]}>
                  ★ {advisor.rating.toFixed(2)} ·{" "}
                  {advisor.specialization ?? "General trainer"}
                </Text>
                <Text style={[styles.planSubtitle, { color: theme.muted }]}>
                  {advisor.experienceYears === null
                    ? "Experience not provided"
                    : `${advisor.experienceYears} yrs exp`}
                </Text>
              </View>
              <View style={styles.priceBlock}>
                <Text style={[styles.price, { color: theme.primary }]}>
                  {advisor.sessionPrice ?? "Unavailable"}
                </Text>
                {advisor.sessionPrice && (
                  <Text style={[styles.currency, { color: theme.muted }]}>
                    ETB / session
                  </Text>
                )}
              </View>
            </View>
          }
        </ScrollView>

        <View style={[styles.bottom, { backgroundColor: theme.background }]}>
          <Button
            mode={mode}
            title={"Add Advisor"}
            onPress={handleFinalize}
            textStyle={{ fontWeight: "500" }}
            style={styles.finalize}
          />
          <Pressable accessibilityRole="button" onPress={handleSkip}>
            <Text style={[styles.skip, { color: theme.foreground }]}>
              Continue without an advisor
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
  content: { paddingBottom: 170 },
  locationRow: {
    marginHorizontal: 39,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationDot: { width: 10, height: 10, borderRadius: 5 },
  location: {
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 1.1,
    fontWeight: "700",
  },
  title: {
    marginHorizontal: 39,
    marginTop: 23,
    fontSize: 25,
    fontWeight: "700",
  },
  toggle: {
    marginHorizontal: 39,
    padding: 8,
    borderRadius: 15,
    flexDirection: "row",
    gap: 5,
  },
  toggleOption: {
    flex: 1,
    minHeight: 54,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  toggleIcon: { fontSize: 24 },
  toggleText: { fontSize: 16, fontWeight: "700" },
  unlockCard: {
    marginHorizontal: 39,
    marginTop: 25,
    minHeight: 88,
    borderRadius: 14,
    padding: 19,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  lockIcon: {
    width: 49,
    height: 49,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockText: { flex: 1, fontSize: 16, lineHeight: 24, fontWeight: "700" },
  instant: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10 },
  instantText: {
    color: "#04281E",
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  advisorCard: {
    marginHorizontal: 39,
    minHeight: 110,
    borderRadius: 15,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  advisorDetails: { flex: 1, gap: 6 },
  advisorName: { fontSize: 16, fontWeight: "700" },
  plan: {
    minHeight: 94,
    borderRadius: 15,
    padding: 19,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  radio: {
    width: 25,
    height: 25,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
  planCopy: { flex: 1, gap: 6 },
  planHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  planTitle: { fontSize: 16, fontWeight: "700" },
  planBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  planSubtitle: { fontSize: 14 },
  priceBlock: { minWidth: 54, alignItems: "flex-end" },
  price: { fontSize: 24, fontWeight: "800" },
  currency: { fontSize: 14, marginTop: 2 },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 39,
    paddingTop: 18,
    paddingBottom: 19,
  },
  finalize: {
    minHeight: 60,
    borderRadius: 14,
  },
  skip: { textAlign: "center", marginTop: 16, fontSize: 15 },
});
