import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useKeepAwake } from "expo-keep-awake";
import {
  checkInService,
  MemberCheckInPass,
} from "../../services/checkIn.service";
import type { ThemePalette } from "../../constants/colors";

type Props = {
  gymId: number;
  slotStart: string;
  slotEnd: string;
  theme: ThemePalette;
};

export function MemberPassQr({ gymId, slotStart, slotEnd, theme }: Props) {
  useKeepAwake();
  const [pass, setPass] = useState<MemberCheckInPass | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offlineWarning, setOfflineWarning] = useState(false);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReadyPass = useRef<Extract<
    MemberCheckInPass,
    { state: "READY" }
  > | null>(null);
  const slotStartMs = new Date(slotStart).getTime();
  const slotEndMs = new Date(slotEnd).getTime();
  const bookingWindowEnded =
    Number.isFinite(slotEndMs) && Date.now() > slotEndMs;

  const refresh = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (Number.isFinite(slotEndMs) && Date.now() > slotEndMs) {
      setPass(null);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const next = await checkInService.getMyPass(gymId);
      setPass(next);
      setOfflineWarning(false);
      if (next.state === "READY") lastReadyPass.current = next;
      setLoading(false);
      const now = Date.now();
      const checkInOpensAt = slotStartMs - 30 * 60_000;
      if (next.state === "CHECKED_IN") {
        // A later booking at the same gym may become eligible while this
        // screen is open. Recheck so its pass can replace the checked-in state.
        timeoutRef.current = setTimeout(() => void refresh(), 60_000);
      } else if (next.state !== "EXPIRED") {
        const delay =
          next.state === "READY"
            ? 30_000
            : checkInOpensAt > now
              ? checkInOpensAt - now
              : 30_000;
        timeoutRef.current = setTimeout(() => void refresh(), delay);
      }
    } catch (requestError) {
      const savedPass = lastReadyPass.current;
      if (savedPass && new Date(savedPass.expiresAt).getTime() > Date.now()) {
        setPass(savedPass);
        setOfflineWarning(true);
      } else {
        setPass(null);
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load your check-in pass.",
      );
      setLoading(false);
      timeoutRef.current = setTimeout(() => void refresh(), 30_000);
    }
  }, [gymId, slotEndMs, slotStartMs]);

  useEffect(() => {
    void refresh();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [refresh]);

  const checkInOpensAt = slotStartMs - 30 * 60_000;
  const isTooEarly =
    Number.isFinite(slotStartMs) && Date.now() < checkInOpensAt;
  const message = bookingWindowEnded
    ? "This booking’s check-in window has ended."
    : pass?.state === "CHECKED_IN"
      ? "You are already checked in for today."
      : pass?.state === "EXPIRED"
        ? "This gym package has expired or has no visits remaining."
        : pass?.state === "NOT_VALID_TODAY"
          ? isTooEarly
            ? `Your check-in QR becomes available 30 minutes before your booking (${new Date(checkInOpensAt).toLocaleString("en-ET", { timeZone: "Africa/Addis_Ababa" })}).`
            : pass.reason === "OUTSIDE_HOURS"
              ? "Your booking is outside the gym’s check-in hours. Please contact the gym."
              : "There is no active booking or package available for check-in right now."
          : null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.title, { color: theme.foreground }]}>
        Check-in QR code
      </Text>
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {!loading && !bookingWindowEnded && pass?.state === "READY" ? (
        <View style={styles.qr}>
          <QRCode value={pass.qrToken} size={220} backgroundColor="#FFFFFF" />
        </View>
      ) : null}
      {!loading && ((error && pass?.state !== "READY") || message) ? (
        <Text
          style={[
            styles.message,
            {
              color:
                error && pass?.state !== "READY" ? theme.error : theme.muted,
            },
          ]}
        >
          {error && pass?.state !== "READY" ? error : message}
        </Text>
      ) : null}
      {pass?.state === "READY" ? (
        <Text
          style={[
            styles.message,
            { color: offlineWarning ? theme.error : theme.muted },
          ]}
        >
          {offlineWarning
            ? "Offline: showing the last pass until it expires. Reconnect to refresh it."
            : "This code refreshes automatically. Keep your screen bright when reception scans it."}
        </Text>
      ) : null}
      {error ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void refresh()}
          style={[styles.retry, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    marginHorizontal: 20,
  },
  title: { fontSize: 17, fontWeight: "700" },
  qr: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16 },
  message: { textAlign: "center", fontSize: 14, lineHeight: 21 },
  retry: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
});
