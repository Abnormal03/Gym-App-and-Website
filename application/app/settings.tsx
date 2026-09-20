// app/settings.tsx
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../src/store/auth.store";
import Constants from "expo-constants";
import { useTheme } from "../src/hooks/useTheme";

// Notification preference keys
const NOTIF_KEYS = {
  bookingConfirmations: "notif_booking_confirmations",
  sessionReminders: "notif_session_reminders",
  promotions: "notif_promotions",
};

export default function SettingsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { logout } = useAuthStore();

  // Notification preferences — default ON for important, OFF for promo
  const [bookingConfirm, setBookingConfirm] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [promotions, setPromotions] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet(Object.values(NOTIF_KEYS));
        const stored = Object.fromEntries(entries);
        const read = (key: string, fallback: boolean) =>
          stored[key] != null ? JSON.parse(stored[key]!) : fallback;
        setBookingConfirm(read(NOTIF_KEYS.bookingConfirmations, true));
        setSessionReminders(read(NOTIF_KEYS.sessionReminders, true));
        setPromotions(read(NOTIF_KEYS.promotions, false));
      } catch {
        // keep defaults
      }
    })();
  }, []);

  const colors = {
    bg: theme.background,
    card: theme.card,
    border: theme.border,
    text: theme.foreground,
    muted: theme.muted,
  };

  const savePreference = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Fail silently — preference just won't persist
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            // TODO: call DELETE /api/users/me when backend endpoint is ready
            Alert.alert(
              "Contact Support",
              "Please contact support@gymapp.com to delete your account.",
            );
          },
        },
      ],
    );
  };

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
    >
      {/* Notifications */}
      <SettingsSection title="Notifications" colors={colors}>
        <ToggleRow
          label="Booking confirmations"
          description="Get notified when a booking is confirmed"
          value={bookingConfirm}
          onChange={(v) => {
            setBookingConfirm(v);
            savePreference(NOTIF_KEYS.bookingConfirmations, v);
          }}
          colors={colors}
        />
        <ToggleRow
          label="Session reminders"
          description="Reminded 1 hour before your workout"
          value={sessionReminders}
          onChange={(v) => {
            setSessionReminders(v);
            savePreference(NOTIF_KEYS.sessionReminders, v);
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
            savePreference(NOTIF_KEYS.promotions, v);
          }}
          colors={colors}
          noBorder
        />
      </SettingsSection>

      {/* About */}
      <SettingsSection title="About" colors={colors}>
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
      <SettingsSection title="Support" colors={colors}>
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
      <SettingsSection title="Danger Zone" colors={colors}>
        <TouchableOpacity
          onPress={handleDeleteAccount}
          style={[styles.dangerRow, { borderColor: colors.border }]}
        >
          <Text style={styles.dangerText}>Delete Account</Text>
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
}: {
  title: string;
  children: React.ReactNode;
  colors: Record<string, string>;
}) => (
  <View style={styles.section}>
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
      trackColor={{ false: "#ccc", true: "#111" }}
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
  container: { flex: 1, paddingTop: 25 },
  content: { padding: 20 },

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
});
