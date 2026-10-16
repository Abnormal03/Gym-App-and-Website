// app/gym/[id].tsx
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Image,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useGymDetail } from "../../../src/hooks/useGymDetails";
import { useAvailability } from "../../../src/hooks/useAvailability";
import { useBookingStore } from "../../../src/store/booking.store";
import { useTheme } from "../../../src/hooks/useTheme";
import type { ThemePalette } from "../../../src/constants/colors";
import { Package } from "../../../src/types/gym.types";
import {
  generateCheckInTimes,
  getAvailableDurations,
  computeCheckOutTime,
  buildAvailabilitySlotEnd,
  buildBookingSlotEnd,
  buildSlotStart,
  formatDuration,
  getNextSevenDays,
  formatShortDay,
  formatDayNumber,
  isSameDay,
} from "../../../src/utils/timeSlots";
import { MaterialIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function GymDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const gymId = Number(id);
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(drawer)/(tabs)");
  };

  const { gym, loading, error } = useGymDetail(gymId);
  const {
    availability,
    loading: availLoading,
    error: availabilityError,
    checkSlot,
    reset,
  } = useAvailability(gymId);
  const setBookingDetails = useBookingStore((s) => s.setBookingDetails);
  const resetPendingAddons = useBookingStore((s) => s.resetPendingAddons);

  const days = getNextSevenDays();

  // Selection state
  const [selectedDate, setSelectedDate] = useState<Date>(days[0]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null); // in hours
  const [bookingType, setBookingType] = useState<"SINGLE" | "GROUP">("SINGLE");
  const [headcount, setHeadcount] = useState(1);

  // Derived values — only computed when dependencies are ready
  const checkOutTime =
    checkInTime && duration ? computeCheckOutTime(checkInTime, duration) : null;

  const availableDurations =
    gym && checkInTime
      ? getAvailableDurations(checkInTime, gym.closingTime)
      : [];

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setCheckInTime(null); // reset downstream selections
    setDuration(null);
    reset();
  };

  const handleCheckInChange = (time: string) => {
    setCheckInTime(time);
    setDuration(null); // reset duration and availability
    reset();
  };

  const handleDurationChange = (hours: number) => {
    if (!checkInTime) return;
    setDuration(hours);

    // Fire availability check immediately
    const slotStart = buildSlotStart(selectedDate, checkInTime);
    const slotEnd = buildAvailabilitySlotEnd(selectedDate, checkInTime, hours);
    checkSlot(slotStart, slotEnd);
  };

  const handleRetryAvailability = () => {
    if (!checkInTime || !duration) return;
    const slotStart = buildSlotStart(selectedDate, checkInTime);
    const slotEnd = buildAvailabilitySlotEnd(
      selectedDate,
      checkInTime,
      duration,
    );
    checkSlot(slotStart, slotEnd);
  };

  const handleBookNow = async () => {
    if (!gym || !selectedPackage || !checkInTime || !duration || !checkOutTime)
      return;

    const slotStart = buildSlotStart(selectedDate, checkInTime);
    const slotEnd = buildBookingSlotEnd(
      selectedDate,
      checkInTime,
      duration,
      selectedPackage.durationDays,
    );
    const expire = new Date();
    expire.setMinutes(expire.getMinutes() + 30);

    try {
      await resetPendingAddons();
      setBookingDetails({
        gymId: gym.id,
        gymName: gym.name,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        packagePrice: selectedPackage.price,
        slotStart,
        slotEnd,
        durationHours: duration,
        bookingType,
        headcount: bookingType === "GROUP" ? headcount : 1,
        expiresAt: expire.toISOString(),
      });

      router.push("/booking/customize/workout-style");
    } catch (error) {
      Alert.alert(
        "Unable to start booking",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  // ─── Derived UI flags ──────────────────────────────────────────────────────

  const canBook =
    selectedPackage !== null &&
    checkInTime !== null &&
    duration !== null &&
    availability !== null &&
    availability.available >= (bookingType === "GROUP" ? headcount : 1);

  const bookBtnLabel = () => {
    if (!selectedPackage) return "Select a Package";
    if (!checkInTime) return "Select Check-in Time";
    if (!duration) return "Select Duration";
    if (availabilityError) return "Retry Availability";
    if (availability && availability.available < (bookingType === "GROUP" ? headcount : 1))
      return "Not enough spaces available";
    return "Book Now";
  };

  // ─── Loading / Error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.foreground} />
      </View>
    );
  }

  if (error || !gym) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? "Gym not found"}</Text>
        <TouchableOpacity onPress={goBack} style={styles.retryBtn}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const checkInTimes = generateCheckInTimes(gym.openingTime, gym.closingTime);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.back,
          {
            backgroundColor: theme.foreground,
          },
        ]}
        onPress={goBack}
      >
        <MaterialIcons
          name="arrow-back-ios"
          size={30}
          color={theme.background}
          style={{ left: 5 }}
        />
      </Pressable>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Photo Carousel ── */}
        {gym.photos.length > 0 ? (
          <FlatList
            data={gym.photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={styles.photo}
                resizeMode="cover"
              />
            )}
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>No photos</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* ── Gym Info ── */}
          <Text style={styles.gymName}>{gym.name}</Text>
          <Text style={styles.address}>{gym.address}</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                🕐 {gym.openingTime} – {gym.closingTime}
              </Text>
            </View>
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                👥 Capacity: {gym.capacity}
              </Text>
            </View>
          </View>

          {/* ── Amenities ── */}
          {gym.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.chipRow}>
                {gym.amenities.map((item) => (
                  <View key={item} style={styles.amenityTag}>
                    <Text style={styles.amenityText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Package Selection ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose a Package</Text>
            {gym.packages?.filter((p) => p.isActive).length === 0 ? (
              <Text style={styles.emptyText}>No packages available</Text>
            ) : (
              gym.packages
                ?.filter((p) => p.isActive)
                .map((pkg) => {
                  const isSelected = selectedPackage?.id === pkg.id;
                  return (
                    <TouchableOpacity
                      key={pkg.id}
                      onPress={() => setSelectedPackage(pkg)}
                      style={[
                        styles.packageCard,
                        isSelected && styles.packageCardSelected,
                      ]}
                    >
                      <View style={styles.packageHeader}>
                        <Text style={styles.packageName}>{pkg.name}</Text>
                        <Text style={styles.packagePrice}>
                          ETB {pkg.price.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.packageMeta}>
                        {pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1)}
                        {" · "}
                        {pkg.durationDays} day
                        {pkg.durationDays > 1 ? "s" : ""}
                      </Text>
                      {pkg.benefits ? (
                        <Text style={styles.packageBenefits}>
                          {pkg.benefits}
                        </Text>
                      ) : null}
                      {isSelected && (
                        <Text style={styles.selectedLabel}>✓ Selected</Text>
                      )}
                    </TouchableOpacity>
                  );
                })
            )}
          </View>

          {/* ── Date Selection ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {days.map((day, i) => {
                const isSelected = isSameDay(day, selectedDate);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleDateChange(day)}
                    style={[
                      styles.dayChip,
                      isSelected && styles.dayChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayLabel,
                        isSelected && styles.selectedChipText,
                      ]}
                    >
                      {formatShortDay(day)}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumber,
                        isSelected && styles.selectedChipText,
                      ]}
                    >
                      {formatDayNumber(day)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Check-in Time ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Check-in Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {checkInTimes.map((time) => {
                const isSelected = checkInTime === time;
                return (
                  <TouchableOpacity
                    key={time}
                    onPress={() => handleCheckInChange(time)}
                    style={[
                      styles.timeChip,
                      isSelected && styles.timeChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeText,
                        isSelected && styles.selectedChipText,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Duration — only appears after check-in is selected ── */}
          {checkInTime && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Duration</Text>
                <Text style={styles.sectionHint}>
                  Max {formatDuration(4)} per visit
                </Text>
              </View>

              <View style={styles.chipRow}>
                {availableDurations.map((hrs) => {
                  const isSelected = duration === hrs;
                  return (
                    <TouchableOpacity
                      key={hrs}
                      onPress={() => handleDurationChange(hrs)}
                      style={[
                        styles.durationChip,
                        isSelected && styles.durationChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.durationText,
                          isSelected && styles.selectedChipText,
                        ]}
                      >
                        {formatDuration(hrs)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Checkout time summary — shows once duration is picked */}
              {checkOutTime && (
                <View style={styles.timeSummary}>
                  <View style={styles.timeSummaryItem}>
                    <Text style={styles.timeSummaryLabel}>Check-in</Text>
                    <Text style={styles.timeSummaryValue}>{checkInTime}</Text>
                  </View>
                  <Text style={styles.timeSummaryArrow}>→</Text>
                  <View style={styles.timeSummaryItem}>
                    <Text style={styles.timeSummaryLabel}>Checkout</Text>
                    <Text style={styles.timeSummaryValue}>{checkOutTime}</Text>
                  </View>
                  <View style={styles.timeSummaryItem}>
                    <Text style={styles.timeSummaryLabel}>Duration</Text>
                    <Text style={styles.timeSummaryValue}>
                      {formatDuration(duration!)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {checkInTime && duration && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Booking type</Text>
              <View style={styles.chipRow}>
                {(["SINGLE", "GROUP"] as const).map((type) => {
                  const selected = bookingType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setBookingType(type);
                        if (type === "SINGLE") setHeadcount(1);
                        else setHeadcount((count) => Math.max(2, count));
                      }}
                      style={[styles.bookingTypeChip, selected && styles.bookingTypeChipSelected]}
                    >
                      <Text style={[styles.durationText, selected && styles.selectedChipText]}>
                        {type === "SINGLE" ? "Individual" : "Group"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {bookingType === "GROUP" && (
                <>
                  <View style={styles.headcountRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.headcountTitle}>People in your group</Text>
                      <Text style={styles.headcountHint}>
                        {availability
                          ? `${availability.available} spaces currently available`
                          : "Availability will be checked for this time slot"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Remove one person"
                      disabled={headcount <= 2}
                      onPress={() => setHeadcount((count) => Math.max(2, count - 1))}
                      style={styles.countButton}
                    >
                      <Text style={styles.countButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.headcountValue}>{headcount}</Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Add one person"
                      disabled={headcount >= (availability?.available ?? gym.capacity)}
                      onPress={() => setHeadcount((count) => count + 1)}
                      style={styles.countButton}
                    >
                      <Text style={styles.countButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.headcountHint}>
                    The final group price is calculated at checkout.
                  </Text>
                </>
              )}
            </View>
          )}

          {/* ── Availability Result ── */}
          {checkInTime && duration && (
            <View style={styles.section}>
              {availLoading ? (
                <View style={styles.availabilityBadge}>
                  <ActivityIndicator size="small" color="#555" />
                  <Text style={styles.availabilityText}>
                    Checking availability...
                  </Text>
                </View>
              ) : availabilityError ? (
                <View style={styles.availabilityError}>
                  <Text style={styles.availabilityErrorText}>
                    {availabilityError}
                  </Text>
                  <TouchableOpacity
                    onPress={handleRetryAvailability}
                    style={styles.availabilityRetryBtn}
                  >
                    <Text style={styles.availabilityRetryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : availability ? (
                <View
                  style={[
                    styles.availabilityBadge,
                    availability.available === 0 && styles.availabilityFull,
                  ]}
                >
                  <Text style={styles.availabilityText}>
                    {availability.available === 0
                      ? "❌  This slot is fully booked — pick a different time or date"
                      : `✅  ${availability.available} of ${availability.capacity} spots available`}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Bottom padding for fixed footer */}
          <View style={{ height: 110 }} />
        </View>
      </ScrollView>

      {/* ── Fixed Book Now Footer ── */}
      <View style={styles.footer}>
        {/* Summary line — shows when enough is selected */}
        {selectedPackage && checkInTime && checkOutTime && (
          <Text style={styles.footerSummary}>
            {selectedPackage.name} · {checkInTime} → {checkOutTime}
            {bookingType === "GROUP"
              ? ` · ${headcount} people · Price at checkout`
              : ` · ETB ${selectedPackage.price.toFixed(2)}`}
          </Text>
        )}
        <TouchableOpacity
          onPress={availabilityError ? handleRetryAvailability : handleBookNow}
          disabled={!canBook && !availabilityError}
          style={[
            styles.bookBtn,
            !canBook && !availabilityError && styles.bookBtnDisabled,
          ]}
        >
          <Text style={styles.bookBtnText}>{bookBtnLabel()}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },

    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    errorText: {
      fontSize: 16,
      color: theme.error,
      textAlign: "center",
      marginBottom: 16,
    },
    retryBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryText: { color: theme.card, fontWeight: "600" },

    //back buttton
    back: {
      position: "absolute",
      top: Platform.OS === "web" ? 10 : 30,
      left: Platform.OS === "web" ? 10 : 20,
      zIndex: 100,
      height: 40,
      width: 40,
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
    },

    // Photos
    photo: { width, height: 260 },
    photoPlaceholder: {
      width,
      height: 200,
      backgroundColor: theme.input,
      justifyContent: "center",
      alignItems: "center",
    },
    photoPlaceholderText: { color: theme.subtle },

    // Content
    content: { padding: 20 },
    gymName: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.foreground,
      marginBottom: 6,
    },
    address: { fontSize: 14, color: theme.muted, marginBottom: 12 },
    infoRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    infoChip: {
      backgroundColor: theme.input,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    infoChipText: { fontSize: 13, color: theme.foreground },

    // Section
    section: { marginTop: 28 },
    sectionTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.foreground,
      marginBottom: 12,
    },
    sectionHint: { fontSize: 12, color: theme.subtle },
    emptyText: { color: theme.subtle, fontSize: 14 },

    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    bookingTypeChip: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
    },
    bookingTypeChipSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    headcountRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 14,
      borderRadius: 12,
      padding: 14,
      backgroundColor: theme.input,
    },
    headcountTitle: { color: theme.foreground, fontSize: 14, fontWeight: "600" },
    headcountHint: { color: theme.muted, fontSize: 12, marginTop: 3 },
    headcountValue: { color: theme.foreground, fontSize: 16, fontWeight: "700", minWidth: 20, textAlign: "center" },
    countButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border },
    countButtonText: { color: theme.foreground, fontSize: 20, fontWeight: "700" },

    // Amenities
    amenityTag: {
      backgroundColor: "#e8f5e9",
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    amenityText: { fontSize: 13, color: "#2e7d32", fontWeight: "500" },

    // Package cards
    packageCard: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    packageCardSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.input,
    },
    packageHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    packageName: { fontSize: 16, fontWeight: "600", color: theme.foreground },
    packagePrice: { fontSize: 16, fontWeight: "700", color: theme.foreground },
    packageMeta: { fontSize: 13, color: theme.muted, marginBottom: 4 },
    packageBenefits: { fontSize: 13, color: theme.muted, marginTop: 4 },
    selectedLabel: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: "600",
      color: theme.success,
    },

    // Date chips
    dayChip: {
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: 8,
      minWidth: 52,
    },
    dayChipSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    dayLabel: { fontSize: 11, color: theme.muted, marginBottom: 2 },
    dayNumber: { fontSize: 16, fontWeight: "600", color: theme.foreground },
    selectedChipText: { color: theme.card },

    // Check-in time chips
    timeChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: 8,
      alignItems: "center",
    },
    timeChipSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    timeText: { fontSize: 14, color: theme.foreground, fontWeight: "500" },

    // Duration chips
    durationChip: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
    },
    durationChipSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    durationText: { fontSize: 14, color: theme.foreground, fontWeight: "500" },

    // Time summary card
    timeSummary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.input,
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
    },
    timeSummaryItem: { alignItems: "center" },
    timeSummaryLabel: { fontSize: 11, color: theme.subtle, marginBottom: 4 },
    timeSummaryValue: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.foreground,
    },
    timeSummaryArrow: { fontSize: 18, color: theme.subtle },

    // Availability
    availabilityBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.input,
      borderRadius: 10,
      padding: 14,
    },
    availabilityFull: { backgroundColor: "#ffebee" },
    availabilityText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.foreground,
      flex: 1,
    },
    availabilityError: {
      backgroundColor: theme.input,
      borderRadius: 10,
      padding: 14,
      gap: 10,
      alignSelf: "center",
    },
    availabilityErrorText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.error,
    },
    availabilityRetryBtn: {
      alignSelf: "center",
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    availabilityRetryText: { color: theme.card, fontWeight: "600" },

    // Footer
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.card,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    footerSummary: {
      fontSize: 12,
      color: theme.muted,
      textAlign: "center",
      marginBottom: 8,
    },
    bookBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
    },
    bookBtnDisabled: { backgroundColor: theme.subtle },
    bookBtnText: { color: theme.card, fontSize: 16, fontWeight: "600" },
  });
