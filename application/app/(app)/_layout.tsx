import { useEffect } from "react";
import { Alert } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../../src/store/auth.store";
import { useBookingStore } from "../../src/store/booking.store";
import { useThemeStore } from "../../src/store/theme.store";

export default function AppLayout() {
  const { user, isLoading, hydrate } = useAuthStore();
  const themeHydrated = useThemeStore((state) => state.hasHydrated);
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const {
    loadPendingBooking,
    savePendingBooking,
    hydratePendingAddons,
  } = useBookingStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    void Promise.all([hydrate(), hydrateTheme()]);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments.includes("(auth)");

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }

    if (user && inAuthGroup) {
      router.replace("/(drawer)/(tabs)");
      return;
    }

    if (user) {
      checkForPendingBooking();
    }
  }, [user, isLoading]);

  const checkForPendingBooking = async () => {
    try {
      await hydratePendingAddons();
      const pending = await loadPendingBooking();
      if (!pending) return;

      const isExpired = new Date() > new Date(pending.expiresAt);
      if (isExpired) {
        return;
      }

      await savePendingBooking(pending);
      router.replace(`/booking/confirmation?tx_ref=${pending.txRef}`);
    } catch (error) {
      Alert.alert(
        "Unable to restore booking",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  if (isLoading || !themeHydrated) return null;

  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade_from_bottom", animationDuration: 220 }} />
  );
}
