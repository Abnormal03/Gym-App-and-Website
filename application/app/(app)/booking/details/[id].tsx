import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../../../src/components/common/ScreenHeader";
import { MemberPassQr } from "../../../../src/components/common/MemberPassQr";
import { BookingDetailSkeleton } from "../../../../src/components/gym/SkeletonLoading";
import { useTheme } from "../../../../src/hooks/useTheme";
import { bookingService } from "../../../../src/services/booking.service";
import type { MyBooking } from "../../../../src/types/booking.types";
import type { ThemePalette } from "../../../../src/constants/colors";

const statusLabels: Record<MyBooking["status"], string> = {
  pending: "Payment pending",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  cancelled: "Cancelled",
  expired: "Expired",
  payment_failed: "Payment failed",
};

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const [booking, setBooking] = useState<MyBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const bookingId = Number(id);

  const loadBooking = useCallback(async () => {
    if (!Number.isSafeInteger(bookingId) || bookingId < 1) {
      setError("This booking link is invalid.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await bookingService.getMemberBookings();
      const found = result.bookings.find((item) => item.id === bookingId);
      if (!found) {
        setError("This booking could not be found in your bookings.");
        setBooking(null);
        return;
      }
      setBooking(found);
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Unable to load booking details.",
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  const addOnItems =
    booking?.order?.items.filter((item) => item.type !== "GYM_BOOKING") ?? [];

  const canCancelBooking =
    booking &&
    (booking.status === "pending" || booking.status === "confirmed") &&
    (booking.checkInCount ?? 0) === 0 &&
    new Date(booking.slotStart).getTime() > Date.now();

  const cancelBooking = () => {
    if (!booking || cancelling) return;

    const performCancel = async () => {
      setCancelling(true);
      try {
        await bookingService.cancel(booking.id);
        showNotice(
          "Booking cancelled",
          "Your booking was cancelled. If it was paid, the refund will be reviewed manually.",
        );
        await loadBooking();
      } catch (err) {
        showNotice(
          "Unable to cancel booking",
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        setCancelling(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to cancel this booking?")) {
        void performCancel();
      }
      return;
    }

    Alert.alert(
      "Cancel booking?",
      "Are you sure you want to cancel this booking?",
      [
        { text: "Keep booking", style: "cancel" },
        {
          text: "Cancel booking",
          style: "destructive",
          onPress: () => void performCancel(),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Booking Details"
          onBackPress={() => {
            router.replace("/(drawer)/(tabs)/bookings");
          }}
        />
        {loading ? (
          <BookingDetailSkeleton theme={theme} />
        ) : error ? (
          <View style={styles.state}>
            <Text style={[styles.message, { color: theme.error }]}>
              {error}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void loadBooking()}
              style={[styles.action, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.actionText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : booking ? (
          <>
            <View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.gymName, { color: theme.foreground }]}>
                {booking.gym.name}
              </Text>
              <Text style={[styles.muted, { color: theme.muted }]}>
                {booking.gym.address}
              </Text>
              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />
              <DetailRow
                label="Package"
                value={booking.package?.name ?? booking.packageName ?? "—"}
                theme={theme}
              />
              {booking.package && (
                <>
                  <DetailRow
                    label="Package type"
                    value={booking.package.type}
                    theme={theme}
                  />
                  <DetailRow
                    label="Package price"
                    value={`ETB ${Number(booking.package.price).toFixed(2)}`}
                    theme={theme}
                  />
                </>
              )}
              <DetailRow
                label="Date"
                value={formatDate(booking.slotStart)}
                theme={theme}
              />
              <DetailRow
                label="Time"
                value={`${formatTime(booking.slotStart)} – ${formatTime(booking.slotEnd)}`}
                theme={theme}
              />
              <DetailRow
                label="Status"
                value={statusLabels[booking.status] ?? booking.status}
                theme={theme}
              />
              <DetailRow
                label="Members Count"
                value={booking.headcount?.toString() || "1"}
                theme={theme}
              />
              <DetailRow
                label="Booking ID"
                value={String(booking.id)}
                theme={theme}
              />
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
                Booked add-ons
              </Text>
              {booking.sessions?.length
                ? booking.sessions.map((session) => (
                    <View key={`session-${session.id}`} style={styles.addOn}>
                      <Text
                        style={[styles.addOnTitle, { color: theme.foreground }]}
                      >
                        {session.providerName ??
                          session.provider?.name ??
                          "Provider session"}
                      </Text>
                      <Text style={[styles.muted, { color: theme.muted }]}>
                        {formatDate(session.startsAt)} ·{" "}
                        {formatTime(session.startsAt)} –{" "}
                        {formatTime(session.endsAt)}
                      </Text>
                      <Text style={[styles.muted, { color: theme.muted }]}>
                        {formatStatus(session.status)}
                      </Text>
                    </View>
                  ))
                : null}
              {booking.consultation?.map((consultation, index) => (
                <View key={`consultation-${index}`} style={styles.addOn}>
                  <Text
                    style={[styles.addOnTitle, { color: theme.foreground }]}
                  >
                    Nutrition consultation
                  </Text>
                  <Text style={[styles.muted, { color: theme.muted }]}>
                    {consultation.consultant?.name ??
                      "Consultant assignment pending"}
                  </Text>
                  <Text style={[styles.muted, { color: theme.muted }]}>
                    {formatStatus(consultation.status)}
                  </Text>
                </View>
              ))}
              {!booking.sessions?.length && !booking.consultation?.length ? (
                <Text style={[styles.muted, { color: theme.muted }]}>
                  No provider or nutrition add-ons were included in this
                  booking.
                </Text>
              ) : null}
              {addOnItems.length ? (
                <>
                  <View
                    style={[styles.divider, { backgroundColor: theme.border }]}
                  />
                  {addOnItems.map((item) => (
                    <DetailRow
                      key={`order-item-${item.id}`}
                      label={item.label}
                      value={`ETB ${Number(item.amount).toFixed(2)}`}
                      theme={theme}
                    />
                  ))}
                </>
              ) : null}
              {booking.order ? (
                <DetailRow
                  label="Order total"
                  value={`ETB ${Number(booking.order.totalAmount).toFixed(2)}`}
                  theme={theme}
                />
              ) : null}
            </View>

            {canCancelBooking ? (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={cancelling}
                onPress={cancelBooking}
                style={[
                  styles.action,
                  {
                    alignSelf: "center",
                    backgroundColor: theme.card,
                    borderColor: theme.error,
                    borderWidth: 1,
                    opacity: cancelling ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={[styles.cancelActionText, { color: theme.error }]}>
                  {cancelling ? "Cancelling..." : "Cancel booking"}
                </Text>
              </TouchableOpacity>
            ) : null}

            {booking.status === "confirmed" ? (
              <MemberPassQr
                gymId={booking.gymId}
                slotStart={booking.slotStart}
                slotEnd={booking.slotEnd}
                theme={theme}
              />
            ) : (
              <View
                style={[
                  styles.qrState,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text
                  style={[styles.sectionTitle, { color: theme.foreground }]}
                >
                  Check-in QR code
                </Text>
                <Text style={[styles.muted, { color: theme.muted }]}>
                  {booking.status === "expired"
                    ? "A check-in QR code is not available for this booking."
                    : booking.status === "pending"
                      ? "Your QR code will appear after payment is confirmed."
                      : "A check-in QR code is not available for this booking status."}
                </Text>
              </View>
            )}

          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function showNotice(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
}

function DetailRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ThemePalette;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.foreground }]}>{value}</Text>
    </View>
  );
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en", {
    timeZone: "Africa/Addis_Ababa",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en", {
    timeZone: "Africa/Addis_Ababa",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const formatStatus = (value: string) =>
  value
    .toLocaleLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 40, gap: 16 },
  loading: { marginTop: 80 },
  state: { alignItems: "center", gap: 14, marginTop: 60 },
  message: { textAlign: "center", lineHeight: 22 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    marginHorizontal: 20,
  },
  gymName: { fontSize: 21, fontWeight: "700" },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  addOn: { gap: 3, paddingVertical: 4 },
  addOnTitle: { fontSize: 15, fontWeight: "600" },
  muted: { fontSize: 14, lineHeight: 21 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#9A9A9A",
    marginVertical: 2,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  label: { flex: 1, fontSize: 14 },
  value: { flex: 1, fontSize: 14, fontWeight: "600", textAlign: "right" },
  qrCard: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 16,
    marginHorizontal: 20,
  },
  qrState: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 10,
    marginHorizontal: 20,
  },
  qr: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16 },
  action: {
    minWidth: 120,
    alignItems: "center",
    borderRadius: 10,
    padding: 12,
  },
  actionText: { color: "#FFFFFF", fontWeight: "700" },
  cancelActionText: { fontWeight: "700" },
});
