import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../../src/components/common/Button";
import { ScreenHeader } from "../../../src/components/common/ScreenHeader";
import { useTheme } from "../../../src/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { physiotherapists } from "../../../src/data/physiotherapists";
import { useBookingStore } from "../../../src/store/booking.store";

export default function PhysiotherapistList() {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const saveSupportChoice = useBookingStore((state) => state.saveSupportChoice);
  const [selectedId, setSelectedId] = useState(physiotherapists[0]?.id | 5);
  const [sort, setSort] = useState("Highest Rated");
  const sortedProviders = [...physiotherapists].sort((a, b) => {
    if (sort === "Most Experience") {
      return (b.experienceYears ?? 0) - (a.experienceYears ?? 0);
    }
    if (sort === "Specialty") {
      return (a.specialization ?? "").localeCompare(b.specialization ?? "");
    }
    return b.rating - a.rating;
  });

  const handleContinue = async () => {
    const physiotherapist = physiotherapists.find(
      (provider) => provider.id === selectedId,
    );
    if (!physiotherapist) return;

    try {
      await saveSupportChoice({
        type: "physiotherapist",
        id: physiotherapist.id,
        name: physiotherapist.name,
        price:
          physiotherapist.sessionPrice === null
            ? null
            : Number(physiotherapist.sessionPrice),
      });
      router.push("/booking/customize/nutrition-advisor");
    } catch (error) {
      Alert.alert(
        "Unable to save physiotherapist choice",
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
          <Text style={[styles.heading, { color: theme.foreground }]}>
            Physiotherapist Profiles
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip
              label="☆ ★ Highest Rated ★"
              active={sort === "Highest Rated"}
              onPress={() => setSort("Highest Rated")}
              theme={theme}
            />
            <Chip
              label="Most Experienced"
              active={sort === "Most Experience"}
              onPress={() => setSort("Most Experience")}
              theme={theme}
            />
            <Chip
              label="Specialty"
              active={sort === "Specialty"}
              onPress={() => setSort("Specialty")}
              theme={theme}
            />
          </ScrollView>
          <View style={styles.providerList}>
            {sortedProviders.map((provider) => {
              const selected = selectedId === provider.id;
              return (
                <View
                  key={provider.id}
                  style={[
                    styles.providerCard,
                    {
                      backgroundColor: selected ? theme.card : theme.input,
                      borderColor: selected ? theme.primary : "transparent",
                    },
                  ]}
                >
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={`Select ${provider.name}`}
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedId(provider.id)}
                    style={styles.providerSelectRow}
                  >
                    {provider.profilePhotoUrl ? (
                      <Image
                        source={{ uri: provider.profilePhotoUrl }}
                        style={styles.photo}
                      />
                    ) : (
                      <View
                        style={[
                          styles.photo,
                          { backgroundColor: theme.border },
                        ]}
                      >
                        <Text style={styles.photoText}>
                          {provider.name.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.providerCopy}>
                      <Text
                        style={[
                          styles.providerName,
                          { color: theme.foreground },
                        ]}
                      >
                        {provider.name}{" "}
                        {provider.verificationStatus === "VERIFIED" && (
                          <Text style={{ color: theme.primary }}>◆</Text>
                        )}
                      </Text>
                      <Text style={[styles.rating, { color: theme.success }]}>
                        ★ {provider.rating.toFixed(2)}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.experience, { color: theme.muted }]}
                      >
                        {provider.experienceYears === null
                          ? "Experience not provided"
                          : `${provider.experienceYears} yrs exp`}
                        {" · "}
                        {provider.specialization ?? "General physiotherapist"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radio,
                        {
                          backgroundColor: selected
                            ? theme.primary
                            : "transparent",
                          borderColor: selected ? theme.primary : theme.muted,
                        },
                      ]}
                    >
                      {selected && <Text style={styles.check}>✓</Text>}
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${provider.name}'s profile`}
                    onPress={() =>
                      router.push(`/physiotherapist/${provider.id}`)
                    }
                    style={styles.viewProfileButton}
                  >
                    <Text
                      style={[styles.viewProfileText, { color: theme.primary }]}
                    >
                      VIEW PROFILE
                    </Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={18}
                      color={theme.primary}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
          <View style={styles.packageSection}>
            <Text style={[styles.packageTitle, { color: theme.foreground }]}>
              Session price
            </Text>
            <Text style={[styles.packageSubtitle, { color: theme.muted }]}>
              One physiotherapy session with{" "}
              {physiotherapists.find((p) => p.id === selectedId)?.name}.
            </Text>
            <View style={styles.packageList}>
              <View
                style={[
                  styles.packageCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.primary,
                  },
                ]}
              >
                <View style={styles.packageCopy}>
                  <Text
                    style={[styles.packageName, { color: theme.foreground }]}
                  >
                    Single physiotherapy session
                  </Text>
                  <Text style={[styles.packageDetail, { color: theme.muted }]}>
                    Price set by the trainer
                  </Text>
                </View>
                <Text style={[styles.price, { color: theme.primary }]}>
                  {physiotherapists.find(
                    (provider) => provider.id === selectedId,
                  )?.sessionPrice
                    ? `${physiotherapists.find((provider) => provider.id === selectedId)?.sessionPrice} ETB`
                    : "Price unavailable"}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
        <View style={[styles.bottom, { backgroundColor: theme.background }]}>
          <Button
            mode={mode}
            title="CONTINUE"
            onPress={handleContinue}
            textStyle={{ fontWeight: "500" }}
            style={styles.button}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress, theme }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? theme.primary : theme.card },
      ]}
    >
      <Text
        style={[styles.chipText, { color: active ? "#fff" : theme.foreground }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1, width: "100%", maxWidth: 540, alignSelf: "center" },
  content: { paddingBottom: 170 },
  summary: { margin: 18, padding: 18, borderRadius: 16, position: "relative" },
  summaryTitle: { fontFamily: "monospace", fontSize: 16, fontWeight: "700" },
  summaryTime: { marginTop: 5, fontSize: 17 },
  summaryCheck: { position: "absolute", right: 16, top: 20, fontSize: 22 },
  heading: {
    paddingHorizontal: 20,
    marginTop: 15,
    fontSize: 20,
    fontWeight: "700",
  },
  chips: { gap: 12, paddingHorizontal: 15, paddingVertical: 22 },
  chip: { paddingHorizontal: 18, paddingVertical: 13, borderRadius: 11 },
  chipText: { fontSize: 11, fontWeight: "600" },
  providerList: { gap: 18, paddingHorizontal: 15 },
  providerCard: {
    minHeight: 150,
    borderRadius: 16,
    borderWidth: 2,
    padding: 10,
    gap: 12,
    width: "100%",
  },
  providerSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  viewProfileButton: {
    alignSelf: "flex-end",
    minHeight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewProfileText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 1,
  },
  photo: {
    width: 108,
    height: 108,
    borderRadius: "50%",
    alignItems: "center",
    justifyContent: "center",
  },
  photoText: { color: "#fff", fontWeight: "800", fontSize: 24 },
  providerCopy: { flex: 1, gap: 8 },
  providerName: { fontSize: 15, fontWeight: "700" },
  rating: { fontFamily: "monospace", fontSize: 13 },
  experience: { fontSize: 13 },
  radio: {
    width: 25,
    height: 25,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  check: { color: "#fff", fontWeight: "800" },
  packageSection: { paddingHorizontal: 20, paddingTop: 30 },
  packageTitle: { fontSize: 24, fontWeight: "800" },
  packageSubtitle: { marginTop: 5, fontSize: 14 },
  packageList: { gap: 12, marginTop: 16 },
  packageCard: {
    minHeight: 84,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  packageRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  packageCopy: { flex: 1, gap: 5 },
  packageName: { fontSize: 16, fontWeight: "700" },
  packageDetail: { fontSize: 13 },
  price: { fontSize: 15, fontWeight: "800" },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 18 },
  button: { minHeight: 64, fontSize: 16, fontWeight: "600" },
});
