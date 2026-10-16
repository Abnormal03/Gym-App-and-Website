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
import { Button } from "../../../../src/components/common/Button";
import { ScreenHeader } from "../../../../src/components/common/ScreenHeader";
import { useTheme } from "../../../../src/hooks/useTheme";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useBookingStore } from "../../../../src/store/booking.store";
import { useProviders } from "../../../../src/hooks/useProviders";

export default function NutritionAdvisorPage() {
  const { theme, mode } = useTheme();
  const gymName = useBookingStore((state) => state.gymName);
  const gymId = useBookingStore((state) => state.gymId);
  const { providers, loading, error, refetch } = useProviders(
    gymId ?? undefined,
    "NUTRITION_CONSULTANT",
  );
  const [selectedId, setSelectedId] = useState<number>();
  const advisors = providers.map((provider) => ({
    ...provider,
    rating: provider.rating ?? provider.ratingAvg ?? 0,
    profilePhotoUrl: provider.profilePhotoUrl ?? provider.photoUrl ?? null,
    specialization:
      provider.specialization ?? provider.specializations?.join(", ") ?? null,
  }));
  const advisor =
    advisors.find((item) => item.id === selectedId) ?? advisors[0];
  const saveNutritionChoice = useBookingStore(
    (state) => state.saveNutritionChoice,
  );
  const nutritionSkipped = useBookingStore((state) => state.nutritionSkipped);
  const clearNutritionChoice = useBookingStore(
    (state) => state.clearNutritionChoice,
  );

  const router = useRouter();
  useEffect(() => {
    if (selectedId === undefined && advisors.length > 0)
      setSelectedId(advisors[0].id);
  }, [selectedId, advisors]);

  const handleFinalize = async () => {
    if (!advisor) return;
    try {
      await saveNutritionChoice({
        id: advisor.id,
        name: advisor.name,
        price: Number(advisor.sessionPrice ?? 0),
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

          <View>
            <Text style={[styles.title, { color: theme.foreground }]}>
              Add Nutrition Advisor
            </Text>
            <Text style={{ color: theme.muted, paddingHorizontal: 40 }}>
              Price will be determined at checkout.
            </Text>
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <Text style={{ color: theme.muted }}>
                Loading nutrition consultants…
              </Text>
            </View>
          ) : error ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void refetch()}
              style={styles.emptyState}
            >
              <Text style={{ color: theme.error }}>{error}</Text>
              <Text style={{ color: theme.primary, marginTop: 8 }}>
                Tap to retry
              </Text>
            </Pressable>
          ) : advisors.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ color: theme.muted }}>
                No nutrition consultants are available at this gym.
              </Text>
            </View>
          ) : (
            <View style={styles.advisorList}>
              {advisors.map((item) => {
                const selected = item.id === advisor?.id;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.advisorCard,
                      {
                        backgroundColor: theme.input,
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedId(item.id)}
                      style={styles.advisorDetails}
                    >
                      <Text
                        style={[
                          styles.advisorName,
                          { color: theme.foreground },
                        ]}
                      >
                        {item.name}
                        {item.verificationStatus === "VERIFIED" ? "  ◆" : ""}
                      </Text>
                      <Text
                        style={[styles.planSubtitle, { color: theme.muted }]}
                      >
                        ★ {item.rating.toFixed(2)} ·{" "}
                        {item.specialization ?? "Nutrition consultant"}
                      </Text>
                      <Text
                        style={[styles.planSubtitle, { color: theme.muted }]}
                      >
                        {item.experienceYears === null
                          ? "Experience not provided"
                          : String(item.experienceYears) + " yrs exp"}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View ${item.name}'s profile`}
                      hitSlop={8}
                      onPress={() => router.push(`/nutrition-consultant/${item.id}`)}
                      style={styles.profileButton}
                    >
                      <MaterialIcons name="open-in-new" size={20} color={theme.primary} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={[styles.bottom, { backgroundColor: theme.background }]}>
          <Button
            mode={mode}
            title={"Add Advisor"}
            onPress={handleFinalize}
            disabled={!advisor || loading}
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
  advisorList: { gap: 12, marginHorizontal: 24, marginTop: 16 },
  emptyState: { marginHorizontal: 39, marginTop: 24, padding: 16 },
  advisorCard: {
    minHeight: 110,
    borderRadius: 15,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  advisorDetails: { flex: 1, gap: 6 },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
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
