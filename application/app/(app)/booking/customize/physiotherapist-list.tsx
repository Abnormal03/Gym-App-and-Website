import { useRef, useState } from "react";
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
import { Button } from "../../../../src/components/common/Button";
import { ScreenHeader } from "../../../../src/components/common/ScreenHeader";
import { useTheme } from "../../../../src/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { useProviders } from "../../../../src/hooks/useProviders";
import { providerService } from "../../../../src/services/provider.service";
import type { ProviderPackage } from "../../../../src/types/gym.types";
import { useBookingStore } from "../../../../src/store/booking.store";
import { buildProviderWindowEnd } from "../../../../src/utils/timeSlots";
import { SkeletonCards } from "../../../../src/components/gym/SkeletonLoading";

export default function PhysiotherapistList() {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const saveSupportChoice = useBookingStore((state) => state.saveSupportChoice);
  const gymId = useBookingStore((state) => state.gymId);
  const slotStart = useBookingStore((state) => state.slotStart);
  const durationHours = useBookingStore((state) => state.durationHours);
  const providerWindowEnd =
    slotStart && durationHours
      ? buildProviderWindowEnd(slotStart, durationHours)
      : undefined;
  const {
    providers: apiProviders,
    loading,
    error,
  } = useProviders(
    gymId ?? undefined,
    "PHYSIOTHERAPIST",
    slotStart ?? undefined,
    providerWindowEnd,
  );
  const physiotherapists = apiProviders.map((provider) => ({
    ...provider,
    rating: provider.rating ?? provider.ratingAvg ?? 0,
    profilePhotoUrl: provider.profilePhotoUrl ?? provider.photoUrl ?? null,
    specialization:
      provider.specialization ?? provider.specializations?.join(", ") ?? null,
  }));
  const [selectedId, setSelectedId] = useState<number>();
  const [providerPackages, setProviderPackages] = useState<ProviderPackage[]>(
    [],
  );
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<number>();
  const [sort, setSort] = useState("Highest Rated");

  const latestPackageRequest = useRef<number | null>(null);
  const sortedProviders = [...physiotherapists].sort((a, b) => {
    if (sort === "Most Experience") {
      return (b.experienceYears ?? 0) - (a.experienceYears ?? 0);
    }
    if (sort === "Specialty") {
      return (a.specialization ?? "").localeCompare(b.specialization ?? "");
    }
    return b.rating - a.rating;
  });

  const loadPackages = async (providerId: number) => {
    latestPackageRequest.current = providerId;
    setProviderPackages([]);
    setSelectedPackageId(undefined);
    setLoadingPackages(true);
    try {
      const packages = await providerService.getPackages(providerId);
      if (latestPackageRequest.current !== providerId) return;
      setProviderPackages(packages);
      setSelectedPackageId(packages[0]?.id);
    } catch (err) {
      if (latestPackageRequest.current !== providerId) return;
      Alert.alert(
        "Unable to load packages",
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      if (latestPackageRequest.current === providerId)
        setLoadingPackages(false);
    }
  };

  const handleContinue = async () => {
    const physiotherapist = physiotherapists.find(
      (provider) => provider.id === selectedId,
    );
    const selectedPackage = providerPackages.find(
      (item) => item.id === selectedPackageId,
    );
    if (!physiotherapist || !selectedPackage) return;

    try {
      await saveSupportChoice({
        type: "physiotherapist",
        id: physiotherapist.id,
        name: physiotherapist.name,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        price: selectedPackage.price,
        firstSessionStartsAt: physiotherapist.validSessionStarts?.[0] ?? "",
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
          {loading ? (
            <SkeletonCards theme={theme} rows={3} variant="provider" />
          ) : error ? (
            <Text style={{ color: theme.error, paddingHorizontal: 20 }}>
              {error}
            </Text>
          ) : sortedProviders.length === 0 ? (
            <Text style={{ color: theme.muted, paddingHorizontal: 20 }}>
              No physiotherapists are available at this gym.
            </Text>
          ) : (
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
                      onPress={() => {
                        setSelectedId(provider.id);
                        void loadPackages(provider.id);
                      }}
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
                        style={[
                          styles.viewProfileText,
                          { color: theme.primary },
                        ]}
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
          )}
          {selectedId && (
            <View style={styles.packageSection}>
              <Text style={[styles.packageTitle, { color: theme.foreground }]}>
                Session price
              </Text>
              <Text style={[styles.packageSubtitle, { color: theme.muted }]}>
                Choose a package with{" "}
                {physiotherapists.find((p) => p.id === selectedId)?.name ??
                  "a physiotherapist"}
                .
              </Text>
              <View style={styles.packageList}>
                {providerPackages.map((pkg) => (
                  <Pressable
                    key={pkg.id}
                    onPress={() => setSelectedPackageId(pkg.id)}
                  >
                    <View
                      style={[
                        styles.packageCard,
                        {
                          backgroundColor: theme.card,
                          borderColor:
                            selectedPackageId === pkg.id
                              ? theme.primary
                              : theme.border,
                        },
                      ]}
                    >
                      <View style={styles.packageCopy}>
                        <Text
                          style={[
                            styles.packageName,
                            { color: theme.foreground },
                          ]}
                        >
                          {pkg.name}
                        </Text>
                        <Text
                          style={[styles.packageDetail, { color: theme.muted }]}
                        >
                          {pkg.sessions
                            ? String(pkg.sessions) + " sessions"
                            : pkg.duration
                              ? String(pkg.duration) + " days"
                              : "Provider package"}
                        </Text>
                      </View>
                      <Text style={[styles.price, { color: theme.primary }]}>
                        ETB {pkg.price.toFixed(2)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
                {loadingPackages && (
                  <Text style={{ color: theme.muted }}>
                    Loading provider packages…
                  </Text>
                )}
                {selectedId &&
                  !loadingPackages &&
                  providerPackages.length === 0 && (
                    <Text style={{ color: theme.muted }}>
                      No packages are available for this provider.
                    </Text>
                  )}
              </View>
            </View>
          )}
        </ScrollView>
        <View style={[styles.bottom, { backgroundColor: theme.background }]}>
          <Button
            mode={mode}
            title="CONTINUE"
            onPress={handleContinue}
            disabled={!selectedId || !selectedPackageId || loadingPackages}
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
