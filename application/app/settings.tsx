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
import { useAuthStore } from "../src/store/auth.store";
import Constants from "expo-constants";
import { useTheme } from "../src/hooks/useTheme";
import { usePreference } from "../src/hooks/usePreference";
import { Preference } from "../src/types/user.types";
import { ScreenHeader } from "../src/components/common/ScreenHeader";
import { router } from "expo-router";

export default function SettingsScreen() {
  const { theme } = useTheme();
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
      contentContainerStyle={{ paddingHorizontal: 20 }}
    >
      <ScreenHeader
        title="Settings"
        onAccountPress={() => router.push("/(drawer)/(tabs)/profile")}
      />
      {/* Notifications */}
      <SettingsSection
        title="Notifications"
        colors={colors}
        style={{ marginTop: 20 }}
      >
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
        <View style={[styles.errorBanner, { backgroundColor: theme.input }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
        </View>
      )}

      {success && (
        <View style={[styles.successBanner, { backgroundColor: theme.input }]}>
          <Text style={[styles.successText, { color: theme.success }]}>
            ✓ {success}
          </Text>
        </View>
      )}

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
