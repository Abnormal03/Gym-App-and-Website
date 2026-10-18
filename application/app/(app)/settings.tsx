import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  StyleProp,
  ViewProps,
  ViewStyle,
  Platform,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../src/store/auth.store";
import Constants from "expo-constants";
import { useTheme } from "../../src/hooks/useTheme";
import { usePreference } from "../../src/hooks/usePreference";
import { Preference } from "../../src/types/user.types";
import { ScreenHeader } from "../../src/components/common/ScreenHeader";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { userService } from "../../src/services/user.service";

export default function SettingsScreen() {
  const {
    theme,
    preference: themePreference,
    setPreference: setThemePreference,
  } = useTheme();
  const { user } = useAuthStore();

  // Notification preferences — default ON for important, OFF for promo
  const { error, saving, success, savePreference: savePref } = usePreference();

  const [bookingConfirm, setBookingConfirm] = useState<boolean>(
    user?.preference?.bookingConfirm ?? true,
  );
  const [sessionReminders, setSessionReminders] = useState<boolean>(
    user?.preference?.sessionReminders ?? true,
  );
  const [promotions, setPromotions] = useState<boolean>(
    user?.preference?.offersAndPromotions ?? false,
  );
  const [pushEnabled, setPushEnabled] = useState(Boolean(user?.expoPushToken));
  const [pushSaving, setPushSaving] = useState(false);

  const updatePushRegistration = async (enabled: boolean) => {
    if (pushSaving) return;
    setPushSaving(true);
    try {
      let expoPushToken: string | null = null;
      if (enabled) {
        if (Platform.OS === "web") throw new Error("Device push notifications are available in the mobile app.");
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId ??
          process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
        if (!projectId) throw new Error("Push notifications need the EAS project ID configured for this app.");
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Gym App notifications",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
        if (status !== "granted") throw new Error("Allow notifications in your device settings to enable them.");
        expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      }

      await userService.updateProfile({ expoPushToken });
      const current = useAuthStore.getState();
      if (current.user && current.token) {
        await current.updatePref({ ...current.user, expoPushToken }, current.token);
      }
      setPushEnabled(enabled);
    } catch (error) {
      Alert.alert(enabled ? "Could not enable notifications" : "Could not update notifications",
        error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPushSaving(false);
    }
  };
  const [hasChanges, setHasChanges] = useState(false);
  const pendingPreference = useRef<Preference | null>(null);
  const savingPreference = useRef(false);

  const colors = {
    bg: theme.background,
    card: theme.card,
    border: theme.border,
    text: theme.foreground,
    muted: theme.muted,
  };

  const queuePreferenceSave = (preference: Preference) => {
    pendingPreference.current = preference;
    if (savingPreference.current) return;

    savingPreference.current = true;
    void (async () => {
      try {
        while (pendingPreference.current) {
          const nextPreference = pendingPreference.current;
          pendingPreference.current = null;
          await savePref(nextPreference);
        }
      } finally {
        savingPreference.current = false;
        if (pendingPreference.current) {
          queuePreferenceSave(pendingPreference.current);
        }
      }
    })();
  };

  const savePreference = () => {
    queuePreferenceSave({
      bookingConfirm,
      sessionReminders,
      offersAndPromotions: promotions,
    });
  };

  useEffect(() => {
    if (!hasChanges) return;
    savePreference();
  }, [hasChanges, bookingConfirm, sessionReminders, promotions]);

  useEffect(() => {
    return () => {
      pendingPreference.current = null;
    };
  }, []);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Deactivate Account",
      "Your account will be deactivated and you will be signed out. Booking, payment, and review records are retained.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await userService.deleteAccount();
                await useAuthStore.getState().logout();
                router.replace("/(auth)/login");
              } catch (error) {
                Alert.alert(
                  "Unable to deactivate account",
                  error instanceof Error ? error.message : "Please try again.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const appVersion = Constants.expoConfig?.version ?? "2.1.0";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{}}
    >
      <ScreenHeader
        title="Settings"
        onAccountPress={() => router.push("/(drawer)/(tabs)/profile")}
        onBackPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/(drawer)/(tabs)");
        }}
      />
      <SettingsSection
        title="Appearance"
        colors={colors}
        style={{ marginTop: 20, paddingHorizontal: 20 }}
      >
        <View style={[styles.themeOptions, { borderColor: colors.border }]}>
          {(["system", "light", "dark"] as const).map((option) => {
            const selected = themePreference === option;
            return (
              <TouchableOpacity
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => void setThemePreference(option)}
                style={[
                  styles.themeOption,
                  selected && { backgroundColor: theme.primary },
                ]}
              >
                <Text
                  style={{
                    color: selected ? "#FFFFFF" : theme.foreground,
                    fontWeight: "600",
                    textTransform: "capitalize",
                  }}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.themeHint, { color: colors.muted }]}>
          Choose a theme for the app and sign-in screens.
        </Text>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        title="Notifications"
        colors={colors}
        style={{ paddingHorizontal: 20 }}
      >
        {Platform.OS !== "web" && (
          <ToggleRow
            label="Device notifications"
            description={pushSaving ? "Updating device registration..." : "Allow booking and session alerts on this device"}
            value={pushEnabled}
            onChange={(enabled) => void updatePushRegistration(enabled)}
            colors={colors}
          />
        )}
        <ToggleRow
          label="Booking confirmations"
          description="Get notified when a booking is confirmed"
          value={bookingConfirm}
          onChange={(v) => {
            setBookingConfirm(v);
            setHasChanges(true);
          }}
          colors={colors}
        />
        <ToggleRow
          label="Session reminders"
          description="Reminded 1 hour before your workout"
          value={sessionReminders}
          onChange={(v) => {
            setSessionReminders(v);
            setHasChanges(true);
          }}
          colors={colors}
          noBorder
        />
        <ToggleRow
          label="Promotions & offers"
          description="Deals and offers from partner gyms"
          value={promotions}
          onChange={(v) => {
            setPromotions(v);
            setHasChanges(true);
          }}
          colors={colors}
          noBorder
        />
      </SettingsSection>

      {error && (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: theme.input, paddingHorizontal: 20 },
          ]}
        >
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
        </View>
      )}

      {saving && (
        <Text style={[styles.saveStatus, { color: theme.muted }]}>
          Saving your preferences…
        </Text>
      )}

      {success && (
        <View
          style={[
            styles.successBanner,
            { backgroundColor: theme.input, paddingHorizontal: 20 },
          ]}
        >
          <Text style={[styles.successText, { color: theme.success }]}>
            ✓ {success}
          </Text>
        </View>
      )}

      {/* About */}
      <SettingsSection
        title="About"
        colors={colors}
        style={{ paddingHorizontal: 20 }}
      >
        <InfoRow label="App Version" value={appVersion} colors={colors} />
        <LinkRow
          label="Terms of Service"
          onPress={() => Linking.openURL("https://yourapp.com/terms")}
          colors={colors}
        />
        <LinkRow
          label="Privacy Policy"
          onPress={() => Linking.openURL("https://yourapp.com/privacy")}
          colors={colors}
          noBorder
        />
      </SettingsSection>

      {/* Support */}
      <SettingsSection
        title="Support"
        colors={colors}
        style={{ paddingHorizontal: 20 }}
      >
        <LinkRow
          label="Help Center"
          onPress={() => Linking.openURL("https://yourapp.com/help")}
          colors={colors}
        />
        <LinkRow
          label="Contact Us"
          onPress={() => Linking.openURL("mailto:support@gymapp.com")}
          colors={colors}
          noBorder
        />
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection
        title="Danger Zone"
        colors={colors}
        style={{ paddingHorizontal: 20 }}
      >
        <TouchableOpacity
          onPress={handleDeleteAccount}
          style={[styles.dangerRow, { borderColor: colors.border }]}
        >
          <Text style={styles.dangerText}>Deactivate Account</Text>
          <Text style={[styles.dangerArrow, { color: colors.muted }]}>▶</Text>
        </TouchableOpacity>
      </SettingsSection>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
const SettingsSection = ({
  title,
  children,
  colors,
  style,
}: {
  title: string;
  children: React.ReactNode;
  colors: Record<string, string>;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.section, style]}>
    <Text style={[styles.sectionTitle, { color: colors.muted }]}>{title}</Text>
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {children}
    </View>
  </View>
);

// ─── Toggle Row ───────────────────────────────────────────────────────────────
const ToggleRow = ({
  label,
  description,
  value,
  onChange,
  colors,
  noBorder = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: Record<string, string>;
  noBorder?: boolean;
}) => (
  <View
    style={[
      styles.row,
      !noBorder && { borderBottomWidth: 1, borderBottomColor: colors.border },
    ]}
  >
    <View style={{ flex: 1, paddingRight: 12 }}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.rowDesc, { color: colors.muted }]}>
        {description}
      </Text>
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor="#fff"
    />
  </View>
);

// ─── Link Row ─────────────────────────────────────────────────────────────────
const LinkRow = ({
  label,
  onPress,
  colors,
  noBorder = false,
}: {
  label: string;
  onPress: () => void;
  colors: Record<string, string>;
  noBorder?: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.row,
      !noBorder && { borderBottomWidth: 1, borderBottomColor: colors.border },
    ]}
  >
    <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
    <Text style={{ color: colors.muted }}>▶</Text>
  </TouchableOpacity>
);

// ─── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: Record<string, string>;
}) => (
  <View
    style={[
      styles.row,
      { borderBottomWidth: 1, borderBottomColor: colors.border },
    ]}
  >
    <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
    <Text style={[styles.rowDesc, { color: colors.muted }]}>{value}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS !== "web" ? 25 : 0 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  themeOptions: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    margin: 12,
  },
  themeOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 9,
  },
  themeHint: { fontSize: 12, marginHorizontal: 16, marginBottom: 12 },
  saveStatus: { fontSize: 12, marginHorizontal: 24, marginBottom: 12 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  rowLabel: { fontSize: 15, fontWeight: "500" },
  rowDesc: { fontSize: 12, marginTop: 2 },

  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  dangerText: { fontSize: 15, color: "#e53935", fontWeight: "500" },
  dangerArrow: { fontSize: 14 },

  errorBanner: {
    backgroundColor: "#ffebee",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#c62828", fontSize: 14 },
  successBanner: {
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  successText: { color: "#2e7d32", fontSize: 14, fontWeight: "500" },
});
