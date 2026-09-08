import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useBookingStore } from "../../src/store/booking.store";
import { bookingService } from "../../src/services/booking.service";

export default function BookingNewScreen() {
  const router = useRouter();
  const store = useBookingStore();
  const [loading, setLoading] = useState(false);

  // Two-step progress so the user knows what's happening during the wait
  const [step, setStep] = useState<"idle" | "creating" | "initializing">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const formatCheckIn = (iso: string) => {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }) +
      " · " +
      d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    );
  };

  const formatCheckOutTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const formatExpiryDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const formatDurationLabel = () => {
    if (!store.slotStart || !store.slotEnd) return "";
    // Duration is just the workout window, not the full package period
    // We stored durationHours separately — derive from checkout - checkin time
    const startTime = new Date(store.slotStart);
    // slotEnd is package period end, so we can't use it for duration display
    // Use packageDurationHours if stored, otherwise just show from store
    return store.durationHours
      ? (() => {
          const h = Math.floor(store.durationHours);
          const m = Math.round((store.durationHours - h) * 60);
          if (h === 0) return `${m}m`;
          if (m === 0) return `${h}h`;
          return `${h}h ${m}m`;
        })()
      : "-";
  };

  const handleConfirm = async () => {
    if (
      !store.gymId ||
      !store.packageId ||
      !store.slotStart ||
      !store.slotEnd
    ) {
      setError("Missing booking details. Please go back and try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ── Step 1: Create the booking ──────────────────────────────────────
      setStep("creating");

      const bookingResponse = await bookingService.create({
        gymId: store.gymId,
        packageId: store.packageId,
        slotStart: store.slotStart,
        slotEnd: store.slotEnd,
      });

      const bookingId = bookingResponse.booking.id;
      const bookingCreatedAt = bookingResponse.booking.createdAt;

      // ── Step 2: Initialize Chapa payment ────────────────────────────────
      setStep("initializing");

      const paymentResponse = await bookingService.initializePayment(bookingId);

      // Compute expiresAt from booking creation time + 30 minutes
      const expiresAt = new Date(
        new Date(bookingCreatedAt).getTime() + 30 * 60 * 1000,
      ).toISOString();

      // ── Save everything to store + SecureStore ───────────────────────────
      await store.savePendingBooking({
        bookingId,
        txRef: paymentResponse.txRef,
        checkoutUrl: paymentResponse.checkoutUrl,
        expiresAt,
        gymName: store.gymName!,
        packageName: store.packageName!,
        packagePrice: store.packagePrice!,
        slotStart: store.slotStart!,
        slotEnd: store.slotEnd!,
      });

      // ── Navigate to payment screen ───────────────────────────────────────
      router.push("/booking/payment");
    } catch (err) {
      // Specific messages for each failure point
      if (step === "creating") {
        setError(err as string); // e.g. "Slot is fully booked"
      } else {
        setError(
          "Booking created but payment setup failed. Please contact support.",
        );
      }
    } finally {
      setLoading(false);
      setStep("idle");
    }
  };

  // Dynamic button label that reflects what's currently happening
  const buttonLabel = () => {
    if (step === "creating") return "Creating booking...";
    if (step === "initializing") return "Setting up payment...";
    return "Confirm & Proceed to Payment";
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Confirm Booking</Text>
      <Text style={styles.subheading}>
        Review your booking before proceeding to payment.
      </Text>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Row label="Gym" value={store.gymName ?? "-"} />
        <Divider />
        <Row label="Package" value={store.packageName ?? "-"} />
        <Divider />
        <Row
          label="Check-in"
          value={store.slotStart ? formatCheckIn(store.slotStart) : "-"}
        />
        <Divider />
        <Row
          label="Check-out"
          value={store.slotEnd ? formatCheckOutTime(store.slotEnd) : "-"}
        />
        <Divider />
        <Row label="Duration" value={formatDurationLabel()} />
        <Divider />
        <Row
          label="Valid until"
          value={store.slotEnd ? formatExpiryDate(store.slotEnd) : "-"}
        />
        <Divider />
        <Row
          label="Total"
          value={`ETB ${store.packagePrice?.toFixed(2) ?? "0.00"}`}
          highlight
        />
      </View>

      {/* 30-min expiry notice */}
      <View style={styles.noticeBox}>
        <Text style={styles.noticeText}>
          ⏳ After confirming, you have{" "}
          <Text style={styles.noticeBold}>30 minutes</Text> to complete payment.
          The slot will be released if unpaid.
        </Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        onPress={handleConfirm}
        disabled={loading}
        style={[styles.confirmBtn, loading && styles.btnDisabled]}
      >
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.confirmBtnText}>{buttonLabel()}</Text>
          </View>
        ) : (
          <Text style={styles.confirmBtnText}>
            Confirm & Proceed to Payment
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        disabled={loading}
        style={styles.backBtn}
      >
        <Text style={styles.backBtnText}>Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────
const Row = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <View style={rowStyles.row}>
    <Text style={rowStyles.label}>{label}</Text>
    <Text style={[rowStyles.value, highlight && rowStyles.highlighted]}>
      {value}
    </Text>
  </View>
);

const Divider = () => (
  <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
);

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  label: { fontSize: 14, color: "#888" },
  value: {
    fontSize: 14,
    color: "#111",
    fontWeight: "500",
    maxWidth: "60%",
    textAlign: "right",
  },
  highlighted: { fontSize: 16, fontWeight: "700", color: "#111" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24 },
  heading: { fontSize: 24, fontWeight: "700", color: "#111", marginBottom: 6 },
  subheading: { fontSize: 14, color: "#888", marginBottom: 28 },

  summaryCard: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },

  noticeBox: {
    backgroundColor: "#fff8e1",
    borderRadius: 12,
    padding: 14,
    marginBottom: 28,
  },
  noticeText: { fontSize: 13, color: "#795548", lineHeight: 20 },
  noticeBold: { fontWeight: "700" },

  errorText: {
    color: "#e53935",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },

  confirmBtn: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    minHeight: 52,
    justifyContent: "center",
  },
  btnDisabled: { backgroundColor: "#555" },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  loadingRow: { flexDirection: "row", alignItems: "center" },

  backBtn: { alignItems: "center", padding: 12 },
  backBtnText: { color: "#888", fontSize: 15 },
});
