import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useBookingStore } from "../../../src/store/booking.store";
import { bookingService } from "../../../src/services/booking.service";
import { useTheme } from "../../../src/hooks/useTheme";
import type { ThemePalette } from "../../../src/constants/colors";
import type {
  CheckoutRequest,
  CheckoutQuoteResponse,
} from "../../../src/types/booking.types";

export default function BookingNewScreen() {
  const router = useRouter();
  const store = useBookingStore();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState<"idle" | "creating" | "initializing">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<CheckoutQuoteResponse["data"] | null>(
    null,
  );
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteRefresh, setQuoteRefresh] = useState(0);

  const checkoutRequest = useMemo<CheckoutRequest | null>(() => {
    if (
      !store.gymId ||
      !store.packageId ||
      !store.slotStart ||
      !store.durationHours
    )
      return null;
    // const startsAt = new Date(store.slotStart).toISOString();
    const request: CheckoutRequest = {
      gymId: store.gymId,
      packageId: store.packageId,
      bookingType: store.bookingType ?? "SINGLE",
      headcount: store.bookingType === "GROUP" ? store.headcount : 1,
      startsAt: store.slotStart,
      durationMinutes: Math.round(store.durationHours * 60),
    };
    if (store.supportChoice) {
      if (!store.supportChoice.packageId) return null;
      request.provider = {
        providerId: store.supportChoice.id,
        providerPackageId: store.supportChoice.packageId,
        firstSessionStartsAt:
          store.supportChoice.firstSessionStartsAt || store.slotStart,
      };
    }
    if (store.nutritionChoice)
      request.consultation = { consultantId: store.nutritionChoice.id };
    return request;
  }, [
    store.gymId,
    store.packageId,
    store.slotStart,
    store.durationHours,
    store.bookingType,
    store.headcount,
    store.supportChoice,
    store.nutritionChoice,
  ]);

  useEffect(() => {
    let active = true;
    setQuote(null);
    setQuoteError(null);
    if (!checkoutRequest) {
      setQuoteLoading(false);
      return () => {
        active = false;
      };
    }
    setQuoteLoading(true);
    bookingService
      .quoteCheckout(checkoutRequest)
      .then((response) => {
        if (!response.success || !response.data)
          throw new Error("The server did not return a checkout quote.");
        if (active) setQuote(response.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setQuoteError(
          typeof err === "string"
            ? err
            : err instanceof Error
              ? err.message
              : "Unable to calculate the checkout total.",
        );
      })
      .finally(() => {
        if (active) setQuoteLoading(false);
      });
    return () => {
      active = false;
    };
  }, [checkoutRequest, quoteRefresh]);

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
    if (!checkoutRequest || !quote) {
      setError(
        "Checkout is not ready yet. Please review the quote and try again.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setStep("creating");
      const checkoutResponse =
        await bookingService.createCheckout(checkoutRequest);
      if (!checkoutResponse.success || !checkoutResponse.data?.bookingId)
        throw new Error("The server did not create the booking checkout.");
      if (!checkoutResponse.data.requiresPayment) {
        Alert.alert(
          "Booking created",
          "Your booking was created. You can check its status in My Bookings.",
        );
        router.replace("/(drawer)/(tabs)/bookings");
        return;
      }
      setStep("initializing");
      const paymentResponse = await bookingService.initializePayment(
        checkoutResponse.data.bookingId,
      );
      const serverExpiry = checkoutResponse.data.expiresAt;
      const expiresAt =
        serverExpiry && Number.isFinite(new Date(serverExpiry).getTime())
          ? new Date(serverExpiry).toISOString()
          : new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await store.savePendingBooking({
        bookingId: checkoutResponse.data.bookingId,
        txRef: paymentResponse.txRef,
        checkoutUrl: paymentResponse.checkoutUrl,
        expiresAt,
        gymName: store.gymName!,
        packageName: store.packageName!,
        packagePrice: store.packagePrice!,
        totalAmount: Number(checkoutResponse.data.totalAmount),
        slotStart: store.slotStart!,
        slotEnd: store.slotEnd!,
        bookingType: store.bookingType,
        headcount: store.headcount,
        gymId: store.gymId!,
        packageId: store.packageId!,
      });
      router.push("/booking/payment");
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Unable to create this checkout.",
      );
    } finally {
      setLoading(false);
      setStep("idle");
    }
  };

  // Dynamic button label that reflects what's currently happening
  const buttonLabel = () => {
    if (step === "creating") return "Creating booking...";
    if (step === "initializing") return "Setting up payment...";
    if (quoteLoading) return "Calculating total...";
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
        <Row label="Gym" value={store.gymName ?? "-"} theme={theme} />
        <Divider theme={theme} />
        <Row label="Package" value={store.packageName ?? "-"} theme={theme} />
        <Divider theme={theme} />
        <Row
          label="Check-in"
          value={store.slotStart ? formatCheckIn(store.slotStart) : "-"}
          theme={theme}
        />
        <Divider theme={theme} />
        <Row
          label="Check-out"
          value={store.slotEnd ? formatCheckOutTime(store.slotEnd) : "-"}
          theme={theme}
        />
        <Divider theme={theme} />
        <Row label="Duration" value={formatDurationLabel()} theme={theme} />
        <Divider theme={theme} />
        <Row
          label="Booking type"
          value={store.bookingType === "GROUP" ? `Group · ${store.headcount} people` : "Individual"}
          theme={theme}
        />
        <Divider theme={theme} />
        <Row
          label="Valid until"
          value={store.slotEnd ? formatExpiryDate(store.slotEnd) : "-"}
          theme={theme}
        />
        <Divider theme={theme} />
        <Row
          label={store.bookingType === "GROUP" ? "Gym Package Base Price" : "Gym Package Price"}
          value={`ETB ${store.packagePrice?.toFixed(2) ?? "0.00"}`}
          theme={theme}
        />
      </View>

      {quoteLoading && (
        <View style={styles.quoteState}>
          <ActivityIndicator color={theme.primary} />
          <Text style={{ color: theme.muted }}>Calculating your total…</Text>
        </View>
      )}
      {quoteError && (
        <TouchableOpacity
          onPress={() => setQuoteRefresh((attempt) => attempt + 1)}
        >
          <Text style={styles.errorText}>{quoteError} · Tap to retry</Text>
        </TouchableOpacity>
      )}
      {quote && (
        <View style={styles.quoteCard}>
          <Text
            style={[styles.pendingAddonsTitle, { color: theme.foreground }]}
          >
            Checkout total
          </Text>
          {quote.items.map((item, index) => (
            <View key={item.type + index} style={styles.pendingAddonRow}>
              <Text style={[styles.pendingAddonLabel, { color: theme.muted }]}>
                {item.label}
              </Text>
              <Text
                style={[styles.pendingAddonPrice, { color: theme.foreground }]}
              >
                ETB {Number(item.amount).toFixed(2)}
              </Text>
            </View>
          ))}
          <Divider theme={theme} />
          <Row
            label="Total"
            theme={theme}
            value={"ETB " + Number(quote.total).toFixed(2)}
            highlight
          />
        </View>
      )}

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
        disabled={loading || quoteLoading || !quote}
        style={[
          styles.confirmBtn,
          (loading || quoteLoading || !quote) && styles.btnDisabled,
        ]}
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
        onPress={() => {
          if (router.canGoBack()) router.back();
          else if (store.gymId) router.replace(`/gym/${store.gymId}`);
          else router.replace("/(drawer)/(tabs)");
        }}
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
  theme,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  theme: ThemePalette;
}) => (
  <View style={rowStyles.row}>
    <Text style={[rowStyles.label, { color: theme.muted }]}>{label}</Text>
    <Text
      style={[
        rowStyles.value,
        { color: theme.foreground },
        highlight && rowStyles.highlighted,
      ]}
    >
      {value}
    </Text>
  </View>
);

const Divider = ({ theme }: { theme: ThemePalette }) => (
  <View style={{ height: 1, backgroundColor: theme.border }} />
);

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  label: { fontSize: 14 },
  value: {
    fontSize: 14,
    fontWeight: "500",
    maxWidth: "60%",
    textAlign: "right",
  },
  highlighted: { fontSize: 16, fontWeight: "700" },
});

const createStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background, paddingTop: 20 },
    content: { padding: 24 },
    heading: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.foreground,
      marginBottom: 6,
    },
    subheading: { fontSize: 14, color: theme.muted, marginBottom: 28 },

    summaryCard: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 20,
    },
    quoteCard: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      backgroundColor: theme.card,
      overflow: "hidden",
      marginBottom: 20,
      padding: 5,
      gap: 5,
    },
    quoteState: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: 16,
    },
    pendingAddonsCard: {
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      marginBottom: 20,
      gap: 12,
    },
    pendingAddonsTitle: {
      color: theme.foreground,
      fontSize: 16,
      fontWeight: "700",
    },
    pendingAddonRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    pendingAddonLabel: {
      flex: 1,
      color: theme.foreground,
      fontSize: 14,
    },
    pendingAddonPrice: {
      color: theme.success,
      fontSize: 14,
      fontWeight: "500",
    },

    noticeBox: {
      backgroundColor: theme.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 28,
    },
    noticeText: { fontSize: 13, color: theme.muted, lineHeight: 20 },
    noticeBold: { fontWeight: "700" },

    errorText: {
      color: theme.error,
      fontSize: 14,
      marginBottom: 16,
      textAlign: "center",
    },

    confirmBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginBottom: 12,
      minHeight: 52,
      justifyContent: "center",
    },
    btnDisabled: { backgroundColor: theme.subtle },
    confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    loadingRow: { flexDirection: "row", alignItems: "center" },

    backBtn: { alignItems: "center", padding: 12 },
    backBtnText: { color: theme.muted, fontSize: 15 },
  });
