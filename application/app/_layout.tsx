import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import "react-native-gesture-handler";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function useNotificationObserver() {
  useEffect(() => {
    // expo-notifications response listeners rely on native modules and are not
    // available in the web bundle. Web push is intentionally disabled.
    if (Platform.OS === "web") return;

    const redirect = (notification: Notifications.Notification) => {
      const url = notification.request.content.data?.url;
      if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) {
        router.push(url as never);
      }
    };
    const initial = Notifications.getLastNotificationResponse();
    if (initial?.notification) redirect(initial.notification);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      redirect(response.notification);
    });
    return () => subscription.remove();
  }, []);
}

export default function RootLayout() {
  useNotificationObserver();
  return <Stack screenOptions={{ headerShown: false }} />;
}
