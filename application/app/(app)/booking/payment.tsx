// app/booking/payment.tsx
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useBookingStore } from "../../../src/store/booking.store";
import { useCountdown } from "../../../src/hooks/useCountdown";
import { useTheme } from "../../../src/hooks/useTheme";
import type { ThemePalette } from "../../../src/constants/colors";

export default function BookingPaymentScreen() {
  const router = useRouter();
  const store = useBookingStore();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const countdown = useCountdown(store.expiresAt);

  const formatSlotTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleOpenChapa = async () => {
    if (!store.checkoutUrl) {
      Alert.alert(
        "Error",
        "Payment URL not available. Please go back and try again.",
      );
      return;
    }

    try {
      await Linking.openURL(store.checkoutUrl);
    } catch {
      Alert.alert("Error", "Unable to open payment page. Please try again.");
    }
  };

  const handleAlreadyPaid = () => {
    if (!store.txRef) return;
    router.replace(`/booking/confirmation?tx_ref=${store.txRef}`);
  };

  const handleCancel = () => {
    if (Platform.OS === "windows") {
      store.clearPendingBooking();
      router.replace("/(drawer)/(tabs)");
    }
    Alert.alert(
      "Cancel Booking?",
      "Your booking will be released and the slot will be freed.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Booking",
          style: "destructive",
          onPress: async () => {
            await store.clearPendingBooking();
            router.replace("/(drawer)/(tabs)");
          },
        },
      ],
    );
  };

  if (countdown.isExpired) {
    return (
      <View style={styles.centered}>
        <Text style={styles.expiredIcon}>⏰</Text>
        <Text style={styles.expiredTitle}>Booking Expired</Text>
        <Text style={styles.expiredMessage}>
          The 30-minute payment window has passed. The slot has been released.
        </Text>
        <TouchableOpacity
          onPress={async () => {
            await store.clearPendingBooking();
            router.replace("/(drawer)/(tabs)");
          }}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Complete Payment</Text>
        <Text style={styles.subheading}>
          Tap "Pay with Chapa" to open the payment page. Your booking is held
          for you until the timer runs out.
        </Text>

        {/* Countdown Timer */}
        <View
          style={[
            styles.timerCard,
            countdown.minutes < 5 && styles.timerCardUrgent,
          ]}
        >
          <Text style={styles.timerLabel}>Time remaining to pay</Text>
          <Text
            style={[
              styles.timerValue,
              countdown.minutes < 5 && styles.timerValueUrgent,
            ]}
          >
            {countdown.formatted}
          </Text>
        </View>

        {/* Booking Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryGym}>{store.gymName}</Text>
          <Text style={styles.summaryPackage}>{store.packageName}</Text>
          {store.slotStart && store.slotEnd && (
            <Text style={styles.summarySlot}>
              {formatSlotTime(store.slotStart)} →{" "}
              {formatSlotTime(store.slotEnd)}
            </Text>
          )}
          <Text style={styles.summarySlot}>
            {store.bookingType === "GROUP" ? `Group booking · ${store.headcount} people` : "Individual booking"}
          </Text>
          <Text style={styles.summaryPrice}>
            ETB {(store.totalAmount ?? store.packagePrice)?.toFixed(2)}
          </Text>
        </View>

        {/* Pay with Chapa */}
        <TouchableOpacity onPress={handleOpenChapa} style={styles.chapaBtn}>
          <Text style={styles.chapaBtnText}>Pay with Chapa</Text>
          <Text style={styles.chapaBtnSub}>
            telebirr · CBE Birr · bank transfer · card
          </Text>
        </TouchableOpacity>

        {/* Fallback — if deep link doesn't fire */}
        <TouchableOpacity
          onPress={handleAlreadyPaid}
          style={styles.alreadyPaidBtn}
        >
          <Text style={styles.alreadyPaidText}>I've already paid →</Text>
        </TouchableOpacity>
      </View>

      {/* Cancel at bottom */}
      <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Cancel Booking</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { flex: 1, padding: 24 },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },

    heading: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.foreground,
      marginBottom: 8,
    },
    subheading: {
      fontSize: 14,
      color: theme.muted,
      marginBottom: 28,
      lineHeight: 21,
    },

    // Timer
    timerCard: {
      backgroundColor: theme.input,
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
      marginBottom: 20,
    },
    timerCardUrgent: { backgroundColor: "#fff3e0" },
    timerLabel: { fontSize: 13, color: theme.muted, marginBottom: 8 },
    timerValue: {
      fontSize: 42,
      fontWeight: "700",
      color: theme.foreground,
      letterSpacing: 2,
    },
    timerValueUrgent: { color: theme.error },

    // Summary
    summaryCard: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    summaryGym: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.foreground,
      marginBottom: 4,
    },
    summaryPackage: { fontSize: 14, color: theme.muted, marginBottom: 4 },
    summarySlot: { fontSize: 13, color: theme.muted, marginBottom: 8 },
    summaryPrice: { fontSize: 20, fontWeight: "700", color: theme.foreground },

    // Chapa button
    chapaBtn: {
      backgroundColor: "#1a237e",
      borderRadius: 12,
      padding: 18,
      alignItems: "center",
      marginBottom: 16,
    },
    chapaBtnText: {
      color: "#fff",
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 4,
    },
    chapaBtnSub: { color: "rgba(255,255,255,0.7)", fontSize: 12 },

    alreadyPaidBtn: { alignItems: "center", padding: 12 },
    alreadyPaidText: { color: theme.primary, fontSize: 14, fontWeight: "500" },

    // Cancel
    cancelBtn: { padding: 20, alignItems: "center" },
    cancelText: { color: theme.error, fontSize: 14 },

    // Expired
    expiredIcon: { fontSize: 56, marginBottom: 16 },
    expiredTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.foreground,
      marginBottom: 10,
    },
    expiredMessage: {
      fontSize: 14,
      color: theme.muted,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 32,
    },
    primaryBtn: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingHorizontal: 32,
      paddingVertical: 14,
    },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  });
