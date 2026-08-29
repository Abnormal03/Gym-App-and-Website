// app/_layout.tsx
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../src/store/auth.store";

export default function RootLayout() {
  const { user, isLoading, hydrate } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    hydrate(); // load saved token on app start
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login"); // not logged in → go to login
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)"); // logged in → go to home
    }
  }, [user, isLoading]);

  if (isLoading) return <></>;

  return <Slot />; // render whatever screen the router decided on
}
