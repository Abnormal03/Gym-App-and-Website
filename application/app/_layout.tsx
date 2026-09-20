// app/_layout.tsx
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../src/store/auth.store";
import { useBookingStore } from "../src/store/booking.store";
import "react-native-gesture-handler";

export default function RootLayout() {
  const { user, isLoading, hydrate } = useAuthStore();
  const { loadPendingBooking, savePendingBooking } = useBookingStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (user && inAuthGroup) {
      router.replace("/(drawer)/(tabs)");
      return;
    }

    // Option B — check for a pending booking after login is confirmed
    if (user) {
      checkForPendingBooking();
    }
  }, [user, isLoading]);

  const checkForPendingBooking = async () => {
    try {
      const pending = await loadPendingBooking();
      if (!pending) return;

      // Check if it's already expired before even restoring it
      const isExpired = new Date() > new Date(pending.expiresAt);
      if (isExpired) {
        // Don't restore — it'll be cleaned up on next verify call
        return;
      }

      // Restore to store so payment/confirmation screens have context
      await savePendingBooking(pending);

      // Take user to confirmation (they may have already paid)
      router.replace(`/booking/confirmation?tx_ref=${pending.txRef}`);
    } catch {
      // If anything goes wrong, just let them start fresh
    }
  };

  if (isLoading) return null;

  return <Slot />;
}
