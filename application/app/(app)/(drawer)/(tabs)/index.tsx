import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRouter } from "expo-router";
import { GymCard, isGymOpenNow, isGymTwentyFourSeven } from "../../../../src/components/gym/GymCard";
import { SkeletonList } from "../../../../src/components/gym/SkeletonLoading";
import { useGyms } from "../../../../src/hooks/useGym";
import { useTheme } from "../../../../src/hooks/useTheme";
import { useAuthStore } from "../../../../src/store/auth.store";

type FilterChipProps = {
  label: string;
  icon?: ComponentProps<typeof MaterialIcons>["name"];
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function FilterChip({ label, icon, selected, disabled, onPress }: FilterChipProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? theme.primary : theme.card,
          borderColor: selected ? theme.primary : theme.border,
          opacity: disabled ? 0.65 : 1,
        },
      ]}
    >
      {icon ? (
        <MaterialIcons name={icon} size={14} color={selected ? "#FFFFFF" : theme.foreground} />
      ) : null}
      <Text style={[styles.filterLabel, { color: selected ? "#FFFFFF" : theme.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [allDayOnly, setAllDayOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const {
    getGyms,
    gyms,
    loading,
    error,
    searchError,
    searchGymByNameAndLocation,
    getGymsNearMe,
    nearMe,
    nearMeLoading,
    nearMeError,
  } = useGyms();

  useEffect(() => {
    void getGyms();
  }, []);

  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const initials = user?.name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

  const visibleGyms = useMemo(() => {
    const filtered = gyms.filter((gym) => {
      if (openNowOnly && !isGymOpenNow(gym)) return false;
      if (allDayOnly && !isGymTwentyFourSeven(gym)) return false;
      return true;
    });
    return showAll ? filtered : filtered.slice(0, 3);
  }, [gyms, openNowOnly, allDayOnly, showAll]);

  const filteredCount = useMemo(
    () => gyms.filter((gym) =>
      (!openNowOnly || isGymOpenNow(gym)) &&
      (!allDayOnly || isGymTwentyFourSeven(gym)),
    ).length,
    [gyms, openNowOnly, allDayOnly],
  );

  const submitSearch = async () => {
    setShowAll(false);
    if (!search.trim()) {
      await getGyms();
      return;
    }
    await searchGymByNameAndLocation(search.trim());
  };

  const toggleNearMe = async () => {
    setShowAll(false);
    if (nearMe) {
      setSearch("");
      await getGyms();
    } else {
      setSearch("");
      await getGymsNearMe();
    }
  };

  const openDrawer = () => {
    const parentNavigation = navigation.getParent() as unknown as
      | { openDrawer?: () => void }
      | undefined;
    parentNavigation?.openDrawer?.();
  };

  const clearFilters = () => {
    setOpenNowOnly(false);
    setAllDayOnly(false);
    setFilterSheetOpen(false);
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.viewport}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={loading || nearMeLoading}
              onRefresh={() => void (nearMe ? getGymsNearMe() : getGyms())}
              tintColor={theme.primary}
            />
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headingRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
              onPress={openDrawer}
              style={[styles.menuButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <MaterialIcons name="menu" size={25} color={theme.foreground} />
            </Pressable>
            <View style={styles.headingCopy}>
              <Text style={[styles.greeting, { color: theme.muted }]}>Good day, {firstName}</Text>
              <Text style={[styles.title, { color: theme.foreground }]}>Find your gym</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open your profile"
              onPress={() => router.push("/(drawer)/(tabs)/profile")}
              style={[styles.profileButton, { backgroundColor: `${theme.primary}18` }]}
            >
              {user?.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} style={styles.profilePhoto} />
              ) : (
                <Text style={[styles.profileInitials, { color: theme.primary }]}>{initials}</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <MaterialIcons name="search" size={20} color={theme.muted} />
              <TextInput
                accessibilityLabel="Search gyms or areas"
                placeholder="Search gyms or areas"
                placeholderTextColor={theme.muted}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => void submitSearch()}
                returnKeyType="search"
                style={[styles.searchInput, { color: theme.foreground }]}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open gym filters"
              onPress={() => setFilterSheetOpen(true)}
              style={[styles.filterButton, { backgroundColor: theme.primary }]}
            >
              <MaterialIcons name="tune" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            contentContainerStyle={styles.quickFilters}
            showsHorizontalScrollIndicator={false}
          >
            <FilterChip
              label="Near me"
              icon="place"
              selected={nearMe}
              disabled={nearMeLoading}
              onPress={() => void toggleNearMe()}
            />
            <FilterChip
              label="Open now"
              selected={openNowOnly}
              onPress={() => {
                setOpenNowOnly((value) => !value);
                setShowAll(false);
              }}
            />
            <FilterChip
              label="24/7"
              selected={allDayOnly}
              onPress={() => {
                setAllDayOnly((value) => !value);
                setShowAll(false);
              }}
            />
          </ScrollView>

          {(nearMeError || searchError) ? (
            <Text style={[styles.inlineError, { color: theme.error }]}>
              {nearMeError || searchError}
            </Text>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Nearby gyms</Text>
            {filteredCount > 3 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAll((value) => !value)}
                hitSlop={8}
              >
                <Text style={[styles.seeAll, { color: theme.primary }]}>
                  {showAll ? "Show less" : "See all"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {loading && gyms.length === 0 ? (
            <SkeletonList theme={theme} />
          ) : visibleGyms.length > 0 ? (
            <View style={styles.gymList}>
              {visibleGyms.map((gym) => (
                <GymCard
                  key={gym.id}
                  gym={gym}
                  theme={theme}
                  onPress={() => router.push(`/gym/${gym.id}`)}
                />
              ))}
            </View>
          ) : error ? (
            <View style={[styles.messageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <MaterialIcons name="wifi-off" size={24} color={theme.muted} />
              <Text style={[styles.messageTitle, { color: theme.foreground }]}>Couldn’t load gyms</Text>
              <Text style={[styles.messageBody, { color: theme.muted }]}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void getGyms()}
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.messageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <MaterialIcons name="fitness-center" size={24} color={theme.muted} />
              <Text style={[styles.messageTitle, { color: theme.foreground }]}>No gyms found</Text>
              <Text style={[styles.messageBody, { color: theme.muted }]}>Try changing your search or filters.</Text>
              {openNowOnly || allDayOnly ? (
                <Pressable onPress={clearFilters} accessibilityRole="button">
                  <Text style={[styles.clearFilters, { color: theme.primary }]}>Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {error && gyms.length > 0 ? (
            <Text style={[styles.staleDataNote, { color: theme.muted }]}>
              Showing saved gyms. Pull to refresh when you’re back online.
            </Text>
          ) : null}
        </ScrollView>
      </View>

      <Modal
        visible={filterSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterSheetOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterSheetOpen(false)}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[styles.filterSheet, { backgroundColor: theme.card }]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
            <View style={styles.sheetHeadingRow}>
              <Text style={[styles.sheetTitle, { color: theme.foreground }]}>Filter gyms</Text>
              <Pressable onPress={clearFilters} accessibilityRole="button">
                <Text style={[styles.clearFilters, { color: theme.primary }]}>Clear</Text>
              </Pressable>
            </View>
            <Text style={[styles.sheetHint, { color: theme.muted }]}>Choose one or more quick filters.</Text>
            <View style={styles.sheetOptions}>
              <FilterChip
                label="Open now"
                selected={openNowOnly}
                onPress={() => setOpenNowOnly((value) => !value)}
              />
              <FilterChip
                label="24/7"
                selected={allDayOnly}
                onPress={() => setAllDayOnly((value) => !value)}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setFilterSheetOpen(false)}
              style={[styles.doneButton, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.doneText}>Show {filteredCount} gyms</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  viewport: { flex: 1, width: "100%", maxWidth: 640, alignSelf: "center" },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 112 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 19 },
  headingCopy: { flex: 1 },
  menuButton: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  greeting: { fontSize: 14, lineHeight: 19, marginBottom: 1 },
  title: { fontSize: 26, lineHeight: 31, fontWeight: "800", letterSpacing: -0.5 },
  profileButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  profilePhoto: { width: "100%", height: "100%" },
  profileInitials: { fontSize: 16, fontWeight: "700" },
  searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  searchBox: { flex: 1, height: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15, borderWidth: 1, borderRadius: 14 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  filterButton: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  quickFilters: { gap: 8, paddingVertical: 14 },
  filterChip: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 15, borderWidth: 1, borderRadius: 22 },
  filterLabel: { fontSize: 14, fontWeight: "600" },
  inlineError: { fontSize: 11, marginTop: 1, marginBottom: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5, marginBottom: 12 },
  sectionTitle: { fontSize: 19, lineHeight: 25, fontWeight: "700" },
  seeAll: { fontSize: 14, fontWeight: "600" },
  gymList: { gap: 16 },
  messageCard: { minHeight: 160, padding: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 14, gap: 7 },
  messageTitle: { fontSize: 14, fontWeight: "700" },
  messageBody: { fontSize: 11, textAlign: "center" },
  retryButton: { minHeight: 36, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", borderRadius: 18, marginTop: 5 },
  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  clearFilters: { fontSize: 12, fontWeight: "700", marginTop: 4 },
  staleDataNote: { fontSize: 10, textAlign: "center", paddingTop: 10 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(14, 20, 36, 0.42)" },
  filterSheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  sheetHandle: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, marginBottom: 18 },
  sheetHeadingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { fontSize: 17, fontWeight: "800" },
  sheetHint: { fontSize: 12, marginTop: 5 },
  sheetOptions: { flexDirection: "row", gap: 8, marginTop: 18 },
  doneButton: { height: 46, alignItems: "center", justifyContent: "center", borderRadius: 12, marginTop: 22 },
  doneText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});

export default HomeScreen;
