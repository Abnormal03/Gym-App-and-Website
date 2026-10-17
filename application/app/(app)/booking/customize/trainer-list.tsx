import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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

type states = "Select Trainer" | "Select Package" | "Continue";

export default function TrainerListScreen() {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const saveSupportChoice = useBookingStore((store) => store.saveSupportChoice);
  const gymId = useBookingStore((store) => store.gymId);
  const slotStart = useBookingStore((store) => store.slotStart);
  const durationHours = useBookingStore((store) => store.durationHours);
  const providerWindowEnd =
    slotStart && durationHours
      ? buildProviderWindowEnd(slotStart, durationHours)
      : undefined;
  const {
    providers: dbTrainers,
    loading,
    error,
  } = useProviders(
    gymId ?? undefined,
    "TRAINER",
    slotStart ?? undefined,
    providerWindowEnd,
  );
  const trainers = useMemo(
    () =>
      dbTrainers.map((provider) => ({
        ...provider,
        rating: provider.rating ?? provider.ratingAvg ?? 0,
        profilePhotoAsset: undefined as number | undefined,
        profilePhotoUrl: provider.profilePhotoUrl ?? provider.photoUrl ?? null,
        specialization:
          provider.specialization ??
          provider.specializations?.join(", ") ??
          null,
      })),
    [dbTrainers],
  );
  const [selectedId, setSelectedId] = useState<number>();
  const [trainerPackages, setTrainerPackages] = useState<
    ProviderPackage[] | null
  >(null);
  const [sort, setSort] = useState("Highest Rated");
  const [selectedPkgId, setSelectedPkgId] = useState<number>();

  const [state, setState] = useState<states>("Select Trainer");
  const sortedTrainers = useMemo(() => {
    if (sort === "Most Experienced") {
      return [...trainers].sort(
        (a, b) => (b.experienceYears ?? 0) - (a.experienceYears ?? 0),
      );
    }
    if (sort === "Specialty") {
      return [...trainers].sort((a, b) =>
        (a.specialization ?? "").localeCompare(b.specialization ?? ""),
      );
    }
    return [...trainers].sort((a, b) => b.rating - a.rating);
  }, [sort, trainers]);

  const pkgs = async (id: number) => {
    setTrainerPackages(null);
    setSelectedPkgId(undefined);
    setState("Select Package");
    try {
      const availablePackages = await providerService.getPackages(id);
      setTrainerPackages(availablePackages);
      setSelectedPkgId(availablePackages[0]?.id);
      if (availablePackages.length > 0) setState("Continue");
      if (availablePackages.length === 0) {
        Alert.alert(
          "No packages available",
          "This trainer has no bookable packages right now.",
        );
      }
    } catch (err) {
      Alert.alert(
        "Unable to load packages",
        err instanceof Error ? err.message : String(err),
      );
      setTrainerPackages([]);
    }
  };

  const handleContinue = async () => {
    const trainer = trainers.find((item) => item.id === selectedId);
    const selectedPackage = trainerPackages?.find(
      (item) => item.id === selectedPkgId,
    );
    if (!trainer || !selectedPackage || state !== "Continue") return;

    try {
      await saveSupportChoice({
        type: "trainer",
        id: trainer.id,
        name: trainer.name,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        price: selectedPackage.price,
        firstSessionStartsAt: trainer.validSessionStarts?.[0] ?? "",
      });
      router.push("/booking/customize/nutrition-advisor");
    } catch (error) {
      Alert.alert(
        "Unable to save trainer choice",
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
          <ScreenHeader
            title="Customize Session"
            onAccountPress={() => router.replace("/(drawer)/(tabs)/profile")}
          />
          <Text style={[styles.title, { color: theme.foreground }]}>
            Available Trainers
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {["Highest Rated", "Most Experienced", "Specialty"].map((item) => {
              const active = sort === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setSort(item)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.filter,
                    { backgroundColor: active ? "#B7C8FF" : theme.card },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: active ? "#173C9D" : theme.foreground },
                    ]}
                  >
                    {active ? "☆  " : ""}
                    {item}
                    {active ? "  ★" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {loading ? (
            <SkeletonCards theme={theme} rows={3} variant="provider" />
          ) : error ? (
            <Text style={{ color: theme.error, paddingHorizontal: 20 }}>
              {error}
            </Text>
          ) : sortedTrainers.length === 0 ? (
            <Text style={{ color: theme.muted, paddingHorizontal: 20 }}>
              No trainers are available at this gym during your booking hours.
            </Text>
          ) : (
            <View style={styles.list}>
              {sortedTrainers.map((trainer) => {
                const selected = trainer.id === selectedId;
                return (
                  <View
                    key={trainer.id}
                    style={[
                      styles.trainerCard,
                      {
                        backgroundColor: selected ? theme.card : theme.input,
                        borderColor: selected ? "#B7C8FF" : "transparent",
                      },
                    ]}
                  >
                    <Pressable
                      onPress={() => {
                        setState("Select Package");
                        setSelectedId(trainer.id);
                        pkgs(trainer.id);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Select ${trainer.name}`}
                      style={styles.trainerSelectRow}
                    >
                      <View style={styles.photoWrap}>
                        {trainer.profilePhotoAsset ? (
                          <Image
                            source={trainer.profilePhotoAsset}
                            style={styles.photo}
                          />
                        ) : trainer.profilePhotoUrl ? (
                          <Image
                            source={{ uri: trainer.profilePhotoUrl }}
                            style={styles.photo}
                          />
                        ) : (
                          <View
                            style={[
                              styles.photo,
                              styles.photoPlaceholder,
                              { backgroundColor: theme.border },
                            ]}
                          >
                            <Text style={{ color: theme.muted }}>
                              {trainer.name.charAt(0)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.trainerCopy}>
                        <View style={styles.nameRow}>
                          <Text
                            style={[styles.name, { color: theme.foreground }]}
                          >
                            {trainer.name}
                          </Text>
                          {/* {trainer.verificationStatus === "VERIFIED" && (
                          <Text
                            style={[styles.verified, { color: theme.success }]}
                            accessibilityLabel="Verified trainer"
                          >
                            ◆
                          </Text>
                        )} */}
                        </View>
                        <Text style={[styles.meta, { color: theme.success }]}>
                          ★ {trainer.rating.toFixed(2)}
                        </Text>
                        <Text
                          style={[styles.specialty, { color: theme.muted }]}
                        >
                          {trainer.experienceYears === null
                            ? "Experience not provided"
                            : `${trainer.experienceYears} yrs exp`}
                          {" • "}
                          {trainer.specialization ?? "General trainer"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.radio,
                          {
                            backgroundColor: selected
                              ? theme.primary
                              : theme.border,
                          },
                        ]}
                      >
                        {selected && <Text style={styles.check}>✓</Text>}
                      </View>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View ${trainer.name}'s profile`}
                      onPress={() => router.push(`/trainer/${trainer.id}`)}
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
          {selectedId && trainerPackages === null && !loading && (
            <Text style={{ color: theme.muted, paddingHorizontal: 20 }}>
              Loading trainer packages…
            </Text>
          )}
          {selectedPkgId && (
            <View style={styles.packageSection}>
              <Text style={[styles.packageTitle, { color: theme.foreground }]}>
                Session price
              </Text>
              <Text style={[styles.packageSubtitle, { color: theme.muted }]}>
                Trainer session with{" "}
                {trainers.find((trainer) => trainer.id === selectedId)?.name}.
              </Text>
              <View style={styles.packageList}>
                {trainerPackages &&
                  trainerPackages.length > 0 &&
                  trainerPackages.map((pkg) => {
                    return (
                      <Pressable
                        onPress={() => {
                          setState("Continue");
                          setSelectedPkgId(pkg.id);
                        }}
                        key={pkg.id}
                      >
                        <View
                          style={[
                            styles.packageCard,
                            {
                              backgroundColor: theme.card,
                              borderColor:
                                selectedPkgId === pkg.id
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
                              style={[
                                styles.packageDetail,
                                { color: theme.muted },
                              ]}
                            >
                              {pkg.sessions
                                ? String(pkg.sessions) + " sessions"
                                : pkg.duration
                                  ? String(pkg.duration) + " days"
                                  : "Provider package"}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.packagePrice,
                              { color: theme.foreground, fontSize: 18 },
                            ]}
                          >
                            {pkg.price}
                            <Text style={{ color: theme.muted, fontSize: 12 }}>
                              {"  "}
                              ETB
                            </Text>
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          )}
        </ScrollView>
        <View style={[styles.bottom, { backgroundColor: theme.background }]}>
          <Button
            mode={mode}
            title={state.toUpperCase()}
            onPress={handleContinue}
            style={styles.button}
            textStyle={{ fontWeight: "500" }}
            disabled={state !== "Continue"}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1, width: "100%", maxWidth: 540, alignSelf: "center" },
  content: { paddingBottom: 150 },
  packageSection: { paddingHorizontal: 20, paddingTop: 28 },
  packageTitle: { fontSize: 20, fontWeight: "700" },
  packageSubtitle: { marginTop: 6, fontSize: 14, lineHeight: 20 },
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
  packageCheck: { color: "#fff", fontSize: 14, fontWeight: "800" },
  packageCopy: { flex: 1, gap: 5 },
  packageNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  packageName: { fontSize: 15, fontWeight: "700" },
  packageDetail: { fontSize: 13 },
  recommended: {
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  packagePrice: { fontSize: 15, fontWeight: "700" },
  progress: { height: 5 },
  progressFill: { width: "55%", height: 5, backgroundColor: "#00D99A" },
  title: {
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
    fontSize: 20,
    fontWeight: "700",
  },
  filters: { paddingHorizontal: 15, gap: 10, paddingBottom: 24 },
  filter: {
    borderRadius: 11,
    paddingHorizontal: 5,
    paddingVertical: 8,
    minWidth: 150,
  },
  filterText: {
    fontFamily: "monospace",
    fontSize: 13,
    letterSpacing: 1,
    fontWeight: "700",
    textAlign: "center",
  },
  list: { paddingHorizontal: 20 },
  trainerCard: {
    minHeight: 150,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 5,
    width: "100%",
  },
  trainerSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  viewProfileButton: {
    alignSelf: "flex-end",
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewProfileText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  photoWrap: { position: "relative" },
  photo: {
    width: 88,
    height: 88,
    borderRadius: "50%",
    backgroundColor: "#303744",
  },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  online: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    color: "#04281E",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
  },
  trainerCopy: { flex: 1, gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 18, fontWeight: "700" },
  verified: { fontSize: 17 },
  meta: { fontFamily: "monospace", fontSize: 13, letterSpacing: 1 },
  specialty: { fontSize: 13 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  check: { color: "#fff", fontSize: 13, fontWeight: "800" },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingTop: 18,
    paddingBottom: 20,
  },
  button: { minHeight: 50, borderRadius: 20 },
});
