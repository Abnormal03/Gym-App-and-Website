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
import { bookingService } from "../../../src/services/booking.service";
import { BookingState, useBookingStore } from "../../../src/store/booking.store";
import { useCountdown } from "../../../src/hooks/useCountdown";
import { resolvePaymentStatus } from "../../../src/utils/resolvePaymentStatus";
import {
  PaymentStatus,
  VerifyPaymentResult,
} from "../../../src/types/booking.types";
import { useTheme } from "../../../src/hooks/useTheme";
import type { ThemePalette } from "../../../src/constants/colors";
import { useAuthStore } from "../../../src/store/auth.store";
import { saveOfflineConfirmedBooking } from "../../../src/services/bookingCache.service";
import type { MyBooking } from "../../../src/types/booking.types";
import { MemberPassQr } from "../../../src/components/common/MemberPassQr";

const POLL_INTERVAL_MS = 60_000;

export default function ConfirmationScreen() {
  const { tx_ref } = useLocalSearchParams<{ tx_ref: string }>();
  const router = useRouter();
  const store = useBookingStore();
  const memberId = useAuthStore((state) => state.user?.id);
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const countdown = useCountdown(store.expiresAt);

  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [result, setResult] = useState<VerifyPaymentResult | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verifyInFlightRef = useRef(false);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const verify = async () => {
    if (!tx_ref || verifyInFlightRef.current) return;
    verifyInFlightRef.current = true;
    try {
      setError(null);
      const response = await bookingService.verifyPayment(tx_ref);
      const raw = response.result;
      setResult(raw);

      const resolved = resolvePaymentStatus(raw, countdown.isExpired);
      setStatus(resolved);

      // Stop polling once we have a final answer
      if (resolved !== "pending") {
        stopPolling();
        if (resolved === "success") {
          const confirmedStore = { ...store };
          setConfirmedBooking(confirmedStore);
        }
        if (resolved === "success" && memberId && store.bookingId) {
          const offlineBooking: MyBooking = {
            id: store.bookingId,
            gymId: store.gymId ?? 0,
            packageId: store.packageId,
            slotStart: store.slotStart ?? new Date().toISOString(),
            slotEnd: store.slotEnd ?? new Date().toISOString(),
            status: "confirmed",
            // The booking UUID is deprecated for scanning; the app requests a rotating member pass.
            qrCode: null,
            createdAt: new Date().toISOString(),
            bookingType: store.bookingType,
            headcount: store.headcount,
            gym: {
              id: store.gymId ?? 0,
              name: store.gymName ?? "Gym booking",
              address: "",
              photos: [],
            },
            package: store.packageId
              ? {
                  id: store.packageId,
                  name: store.packageName ?? "Gym package",
                  type: "",
                  price: store.packagePrice ?? 0,
                }
              : null,
          };
          await saveOfflineConfirmedBooking(memberId, offlineBooking).catch(
            () => undefined,
          );
        }
        await store.clearPendingBooking();
      }
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Unable to verify payment right now",
      );
    } finally {
      verifyInFlightRef.current = false;
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
          onPress={() => router.replace("/(drawer)/(tabs)")}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === "pending") {
    return <PendingState countdown={countdown} error={error} styles={styles} />;
  }

  if (status === "success") {
    return (
      <SuccessState
        store={confirmedBooking ?? store}
        router={router}
        styles={styles}
        theme={theme}
      />
    );
  }

  if (status === "expired") {
    return <ExpiredState router={router} store={store} styles={styles} />;
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
        router.replace("/(drawer)/(tabs)");
      }}
      styles={styles}
    />
  );
}

type ConfirmationStyles = ReturnType<typeof createStyles>;

// ─── Pending ──────────────────────────────────────────────────────────────────
const PendingState = ({
  countdown,
  error,
  styles,
}: {
  countdown: ReturnType<typeof useCountdown>;
  error: string | null;
  styles: ConfirmationStyles;
}) => (
  <View style={styles.centered}>
    <ActivityIndicator size="large" color="#111" style={{ marginBottom: 24 }} />
    <Text style={styles.pendingTitle}>Verifying Payment</Text>
    <Text style={styles.pendingMessage}>
      We're confirming your payment with Chapa.{"\n"}
      This page checks automatically every minute.
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
    {error ? (
      <Text style={styles.pendingMessage}>
        {error} We’ll retry automatically.
      </Text>
    ) : null}
    <Text style={styles.checkingNote}>Checking every minute</Text>
  </View>
);

// ─── Success ──────────────────────────────────────────────────────────────────
const SuccessState = ({
  store,
  router,
  styles,
  theme,
}: {
  store: BookingState;
  router: ReturnType<typeof useRouter>;
  styles: ConfirmationStyles;
  theme: ThemePalette;
}) => {
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      timeZone: "Africa/Addis_Ababa",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      timeZone: "Africa/Addis_Ababa",
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
          Your secure check-in QR becomes available 30 minutes before your booking and refreshes automatically.
        </Text>
      </View>

      {store.gymId && store.slotStart && store.slotEnd ? (
        <MemberPassQr gymId={store.gymId} slotStart={store.slotStart} slotEnd={store.slotEnd} theme={theme} />
      ) : null}

      {/* Booking details from store */}
      <View style={styles.detailsCard}>
        <DetailRow label="Gym" value={store.gymName ?? "-"} theme={theme} />
        <DetailRow
          label="Package"
          value={store.packageName ?? "-"}
          theme={theme}
        />
        {store.slotStart && (
          <DetailRow
            label="Date"
            value={formatDate(store.slotStart)}
            theme={theme}
          />
        )}
        {store.slotStart && (
          <DetailRow
            label="Check-in"
            value={formatTime(store.slotStart)}
            theme={theme}
          />
        )}
        {store.slotEnd && (
          <DetailRow
            label="Check-out"
            value={formatTime(store.slotEnd)}
            theme={theme}
          />
        )}
        <DetailRow
          label="Booking type"
          value={store.bookingType === "GROUP" ? `Group · ${store.headcount} people` : "Individual"}
          theme={theme}
        />
        <DetailRow
          label="Amount Paid"
          value={`ETB ${(store.totalAmount ?? store.packagePrice)?.toFixed(2) ?? "0.00"}`}
          theme={theme}
        />
      </View>

      <TouchableOpacity
        onPress={() => router.replace("/(drawer)/(tabs)/bookings")}
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryBtnText}>View My Bookings</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={async () => {
          router.replace("/(drawer)/(tabs)");
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
  styles,
}: {
  error: string | null;
  onRetry: () => void;
  onHome: () => void;
  styles: ConfirmationStyles;
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
  styles,
}: {
  router: ReturnType<typeof useRouter>;
  store: BookingState;
  styles: ConfirmationStyles;
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
        router.replace("/(drawer)/(tabs)");
      }}
      style={styles.primaryBtn}
    >
      <Text style={styles.primaryBtnText}>Find a Gym</Text>
    </TouchableOpacity>
  </View>
);

// ─── Detail Row ───────────────────────────────────────────────────────────────
const DetailRow = ({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ThemePalette;
}) => (
  <View style={[detailStyles.row, { borderBottomColor: theme.border }]}>
    <Text style={[detailStyles.label, { color: theme.muted }]}>{label}</Text>
    <Text style={[detailStyles.value, { color: theme.foreground }]}>
      {value}
    </Text>
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
const createStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { padding: 24, alignItems: "center" },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
      backgroundColor: theme.background,
    },
    pendingTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.foreground,
      marginBottom: 10,
    },
    pendingMessage: {
      fontSize: 14,
      color: theme.muted,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 24,
    },
    countdownBadge: {
      backgroundColor: theme.input,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 10,
      marginBottom: 12,
    },
    countdownBadgeUrgent: { backgroundColor: "#fff3e0" },
    countdownText: { fontSize: 16, fontWeight: "600", color: theme.muted },
    countdownTextUrgent: { color: theme.error },
    checkingNote: { fontSize: 12, color: theme.subtle },

    successHeader: { alignItems: "center", marginBottom: 28, width: "100%" },
    successIconCircle: {
      width: 42,
      height: 42,
      borderRadius: 36,
      backgroundColor: theme.input,
      justifyContent: "center",
      alignItems: "center",
    },
    successIcon: { fontSize: 34, color: theme.success },
    successTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.foreground,
    },
    successMessage: {
      fontSize: 14,
      color: theme.muted,
      textAlign: "center",
      lineHeight: 21,
    },

    qrContainer: {
      alignItems: "center",
      backgroundColor: theme.card,
      padding: 24,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 24,
      width: "100%",
    },
    qrHint: { fontSize: 12, color: theme.subtle, marginTop: 14 },
    qrFallback: { color: theme.subtle, fontSize: 14, textAlign: "center" },

    detailsCard: {
      width: "100%",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 28,
    },

    failedIcon: { fontSize: 52, color: theme.error, marginBottom: 16 },
    failedTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.foreground,
      marginBottom: 10,
    },
    failedMessage: {
      fontSize: 14,
      color: theme.muted,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 32,
    },
    expiredIcon: { fontSize: 52, marginBottom: 16 },

    primaryBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      width: "100%",
      marginBottom: 12,
    },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    secondaryBtn: { alignItems: "center", padding: 12, width: "100%" },
    secondaryBtnText: { color: theme.muted, fontSize: 15 },
    successHead: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      marginBottom: 16,
    },
  });
