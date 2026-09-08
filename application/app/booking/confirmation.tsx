// app/booking/confirmation.tsx
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import QRCode from "react-native-qrcode-svg";
import { bookingService } from "../../src/services/booking.service";
import { BookingState, useBookingStore } from "../../src/store/booking.store";
import { useCountdown } from "../../src/hooks/useCountdown";
import { resolvePaymentStatus } from "../../src/utils/resolvePaymentStatus";
import {
  PaymentStatus,
  VerifyPaymentResult,
} from "../../src/types/booking.types";

const POLL_INTERVAL_MS = 10_000;

export default function ConfirmationScreen() {
  const { tx_ref } = useLocalSearchParams<{ tx_ref: string }>();
  const router = useRouter();
  const store = useBookingStore();
  const countdown = useCountdown(store.expiresAt);

  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [result, setResult] = useState<VerifyPaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const verify = async () => {
    if (!tx_ref) return;
    try {
      const response = await bookingService.verifyPayment(tx_ref);
      const raw = response.result;
      setResult(raw);

      const resolved = resolvePaymentStatus(raw, countdown.isExpired);
      setStatus(resolved);

      // Stop polling once we have a final answer
      if (resolved !== "pending") {
        stopPolling();
        // await store.clearPendingBooking();
      }
    } catch (err) {
      setError(err as string);
    }
  };

  useEffect(() => {
    verify();
    intervalRef.current = setInterval(verify, POLL_INTERVAL_MS);
    return () => stopPolling();
  }, [tx_ref]);

  useEffect(() => {
    if (countdown.isExpired && status === "pending") {
      verify();
    }
  }, [countdown.isExpired]);

  if (!tx_ref) {
    return (
      <View style={styles.centered}>
        <Text style={styles.failedTitle}>No booking found</Text>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === "pending") {
    return <PendingState countdown={countdown} />;
  }

  if (status === "success") {
    return (
      <SuccessState
        qrCode={result?.qrCode ?? null}
        store={store}
        router={router}
      />
    );
  }

  if (status === "expired") {
    return <ExpiredState router={router} store={store} />;
  }

  return (
    <FailedState
      error={error}
      onRetry={async () => {
        if (store.checkoutUrl) {
          await Linking.openURL(store.checkoutUrl);
          setStatus("pending");
          intervalRef.current = setInterval(verify, POLL_INTERVAL_MS);
        }
      }}
      onHome={async () => {
        await store.clearPendingBooking();
        router.replace("/(tabs)");
      }}
    />
  );
}

// ─── Pending ──────────────────────────────────────────────────────────────────
const PendingState = ({
  countdown,
}: {
  countdown: ReturnType<typeof useCountdown>;
}) => (
  <View style={styles.centered}>
    <ActivityIndicator size="large" color="#111" style={{ marginBottom: 24 }} />
    <Text style={styles.pendingTitle}>Verifying Payment</Text>
    <Text style={styles.pendingMessage}>
      We're confirming your payment with Chapa.{"\n"}
      This page checks automatically every 10 seconds.
    </Text>
    <View
      style={[
        styles.countdownBadge,
        countdown.minutes < 5 && styles.countdownBadgeUrgent,
      ]}
    >
      <Text
        style={[
          styles.countdownText,
          countdown.minutes < 5 && styles.countdownTextUrgent,
        ]}
      >
        {countdown.isExpired
          ? "Finalizing..."
          : `${countdown.formatted} remaining`}
      </Text>
    </View>
    <Text style={styles.checkingNote}>Checking every 10 seconds</Text>
  </View>
);

// ─── Success ──────────────────────────────────────────────────────────────────
const SuccessState = ({
  qrCode,
  store,
  router,
}: {
  qrCode: string | null;
  store: BookingState;
  router: ReturnType<typeof useRouter>;
}) => {
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.successHeader}>
        <View style={styles.successHead}>
          <View style={styles.successIconCircle}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
        </View>
        <Text style={styles.successMessage}>
          Show this QR code at the gym reception to check in.
        </Text>
      </View>

      {/* QR Code */}
      <View style={styles.qrContainer}>
        {qrCode ? (
          <>
            <QRCode value={qrCode} size={220} />
            <Text style={styles.qrHint}>Keep screen bright when scanning</Text>
          </>
        ) : (
          <Text style={styles.qrFallback}>
            QR code will appear shortly — check My Bookings
          </Text>
        )}
      </View>

      {/* Booking details from store */}
      <View style={styles.detailsCard}>
        <DetailRow label="Gym" value={store.gymName ?? "-"} />
        <DetailRow label="Package" value={store.packageName ?? "-"} />
        {store.slotStart && (
          <DetailRow label="Date" value={formatDate(store.slotStart)} />
        )}
        {store.slotStart && (
          <DetailRow label="Check-in" value={formatTime(store.slotStart)} />
        )}
        {store.slotEnd && (
          <DetailRow label="Check-out" value={formatTime(store.slotEnd)} />
        )}
        <DetailRow
          label="Amount Paid"
          value={`ETB ${store.packagePrice?.toFixed(2) ?? "0.00"}`}
        />
      </View>

      <TouchableOpacity
        onPress={() => router.replace("/(tabs)/bookings")}
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryBtnText}>View My Bookings</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={async () => {
          router.replace("/(tabs)");
          await store.clearPendingBooking();
        }}
        style={styles.secondaryBtn}
      >
        <Text style={styles.secondaryBtnText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── Failed ───────────────────────────────────────────────────────────────────
const FailedState = ({
  error,
  onRetry,
  onHome,
}: {
  error: string | null;
  onRetry: () => void;
  onHome: () => void;
}) => (
  <View style={styles.centered}>
    <Text style={styles.failedIcon}>✕</Text>
    <Text style={styles.failedTitle}>Payment Failed</Text>
    <Text style={styles.failedMessage}>
      {error ??
        "Your payment could not be processed. You can try again or book later."}
    </Text>
    <TouchableOpacity onPress={onRetry} style={styles.primaryBtn}>
      <Text style={styles.primaryBtnText}>Try Again</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={onHome} style={styles.secondaryBtn}>
      <Text style={styles.secondaryBtnText}>Back to Home</Text>
    </TouchableOpacity>
  </View>
);

// ─── Expired ──────────────────────────────────────────────────────────────────
const ExpiredState = ({
  router,
  store,
}: {
  router: ReturnType<typeof useRouter>;
  store: BookingState;
}) => (
  <View style={styles.centered}>
    <Text style={styles.expiredIcon}>⏰</Text>
    <Text style={styles.failedTitle}>Booking Expired</Text>
    <Text style={styles.failedMessage}>
      The 30-minute payment window passed.{"\n"}
      Your slot has been released — you can book again anytime.
    </Text>
    <TouchableOpacity
      onPress={async () => {
        await store.clearPendingBooking();
        router.replace("/(tabs)");
      }}
      style={styles.primaryBtn}
    >
      <Text style={styles.primaryBtnText}>Find a Gym</Text>
    </TouchableOpacity>
  </View>
);

// ─── Detail Row ───────────────────────────────────────────────────────────────
const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={detailStyles.row}>
    <Text style={detailStyles.label}>{label}</Text>
    <Text style={detailStyles.value}>{value}</Text>
  </View>
);

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  label: { fontSize: 14, color: "#888" },
  value: { fontSize: 14, color: "#111", fontWeight: "500" },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24, alignItems: "center" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
  },
  pendingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },
  pendingMessage: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  countdownBadge: {
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 12,
  },
  countdownBadgeUrgent: { backgroundColor: "#fff3e0" },
  countdownText: { fontSize: 16, fontWeight: "600", color: "#555" },
  countdownTextUrgent: { color: "#e65100" },
  checkingNote: { fontSize: 12, color: "#bbb" },

  successHeader: { alignItems: "center", marginBottom: 28, width: "100%" },
  successIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 36,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
  },
  successIcon: { fontSize: 34, color: "#2e7d32" },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
  },
  successMessage: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 21,
  },

  qrContainer: {
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 24,
    width: "100%",
  },
  qrHint: { fontSize: 12, color: "#aaa", marginTop: 14 },
  qrFallback: { color: "#aaa", fontSize: 14, textAlign: "center" },

  detailsCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
  },

  failedIcon: { fontSize: 52, color: "#e53935", marginBottom: 16 },
  failedTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },
  failedMessage: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  expiredIcon: { fontSize: 52, marginBottom: 16 },

  primaryBtn: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: { alignItems: "center", padding: 12, width: "100%" },
  secondaryBtnText: { color: "#888", fontSize: 15 },
  successHead: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginBottom: 16,
  },
});
