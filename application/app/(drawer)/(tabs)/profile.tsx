// app/(drawer)/(tabs)/profile.tsx
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { useProfile } from "../../../src/hooks/useProfile";
import { useAuthStore } from "../../../src/store/auth.store";
import { useRouter } from "expo-router";
import { useTheme } from "../../../src/hooks/useTheme";
// import * as ImagePicker from "expo-image-picker";

export default function ProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { logout } = useAuthStore();
  const {
    user: savedUser,
    saving,
    error,
    success,
    savingPass,
    passError,
    updateProfile,
    changePassword,
    loadProfile,
  } = useProfile();

  const [user, setUser] = useState(savedUser);

  // Password change state — kept local to this screen
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const colors = {
    bg: theme.background,
    card: theme.card,
    border: theme.border,
    text: theme.foreground,
    muted: theme.muted,
    input: theme.input,
    inputBorder: theme.border,
  };

  const loadUser = async () => {
    const nameBeforeLoad = name;
    const phoneBeforeLoad = phone;
    const loadedUser = await loadProfile();
    setUser(loadedUser);
    setName((currentName) =>
      currentName === nameBeforeLoad ? (loadedUser?.name ?? "") : currentName,
    );
    setPhone((currentPhone) =>
      currentPhone === phoneBeforeLoad
        ? (loadedUser?.phone ?? "")
        : currentPhone,
    );
  };

  useEffect(() => {
    loadUser();
  }, []);

  // Editable fields mirror the user object
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Name cannot be empty");
      return;
    }
    await updateProfile({ name: name.trim(), phone: phone.trim() });
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Validation", "All password fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Validation", "New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Validation", "Password must be at least 8 characters");
      return;
    }
    await changePassword({ currentPassword, newPassword });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordSection(false);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarWrapper}>
          {user?.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                { backgroundColor: theme.input },
              ]}
            >
              <Text style={styles.avatarInitial}>
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.avatarName, { color: colors.text }]}>
          {user?.name}
        </Text>
        <Text style={[styles.avatarEmail, { color: colors.muted }]}>
          {user?.email}
        </Text>
      </View>

      {/* Feedback messages */}
      {success && (
        <View style={[styles.successBanner, { backgroundColor: theme.input }]}>
          <Text style={[styles.successText, { color: theme.success }]}>
            ✓ {success}
          </Text>
        </View>
      )}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: theme.input }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
        </View>
      )}

      {/* Personal Information */}
      <Section title="Personal Information" colors={colors}>
        <Field label="Full Name" colors={colors}>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.input,
                borderColor: colors.inputBorder,
              },
            ]}
            placeholder="Your full name"
            placeholderTextColor={colors.muted}
          />
        </Field>
        <Field label="Phone" colors={colors}>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.input,
                borderColor: colors.inputBorder,
              },
            ]}
            placeholder="Your phone number"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
          />
        </Field>
        <Field label="Email" colors={colors}>
          <Text
            style={[
              styles.readOnlyField,
              {
                color: colors.muted,
                backgroundColor: colors.input,
                borderColor: colors.inputBorder,
              },
            ]}
          >
            {user?.email}
          </Text>
        </Field>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[
            styles.saveBtn,
            { backgroundColor: theme.primary },
            saving && styles.saveBtnDisabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.card} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </Section>

      {/* Account */}
      {passError && (
        <View style={[styles.errorBanner, { backgroundColor: theme.input }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            {passError}
          </Text>
        </View>
      )}
      <Section title="Account" colors={colors}>
        <TouchableOpacity
          onPress={() => setShowPasswordSection(!showPasswordSection)}
          style={[styles.accountItem, { borderBottomColor: colors.border }]}
        >
          <Text style={[styles.accountItemText, { color: colors.text }]}>
            Change Password
          </Text>
          <Text style={{ color: colors.muted }}>
            {showPasswordSection ? "▲" : "▶"}
          </Text>
        </TouchableOpacity>

        {showPasswordSection && (
          <View style={styles.passwordSection}>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Current password"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                },
              ]}
            />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="New password"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                },
              ]}
            />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Confirm new password"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                },
              ]}
            />
            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={savingPass}
              style={[
                styles.saveBtn,
                { backgroundColor: theme.primary },
                savingPass && styles.saveBtnDisabled,
              ]}
            >
              {savingPass ? (
                <ActivityIndicator color={theme.card} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={[styles.accountItem, { borderBottomColor: colors.border }]}
        >
          <Text style={[styles.accountItemText, { color: colors.text }]}>
            Notification Settings
          </Text>
          <Text style={{ color: colors.muted }}>▶</Text>
        </TouchableOpacity>
      </Section>

      {/* Activity */}
      <Section title="Activity" colors={colors}>
        <View style={styles.activityRow}>
          <View style={styles.activityItem}>
            <Text style={[styles.activityValue, { color: colors.text }]}>
              {user?.totalBookings ?? "—"}
            </Text>
            <Text style={[styles.activityLabel, { color: colors.muted }]}>
              Total Bookings
            </Text>
          </View>
          <View
            style={[styles.activityDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.activityItem}>
            <Text style={[styles.activityValue, { color: colors.text }]}>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </Text>
            <Text style={[styles.activityLabel, { color: colors.muted }]}>
              Member Since
            </Text>
          </View>
        </View>
      </Section>

      {/* Log Out */}
      <TouchableOpacity
        onPress={handleLogout}
        style={[
          styles.logoutBtn,
          { borderColor: theme.error, backgroundColor: theme.input },
        ]}
      >
        <Text style={[styles.logoutText, { color: theme.error }]}>Log Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({
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
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  </View>
);

const Field = ({
  label,
  children,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  colors: Record<string, string>;
}) => (
  <View style={styles.field}>
    <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
    {children}
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },

  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatarWrapper: { marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 36, fontWeight: "700", color: "#fff" },
  avatarName: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  avatarEmail: { fontSize: 14 },

  successBanner: {
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  successText: { color: "#2e7d32", fontSize: 14, fontWeight: "500" },
  errorBanner: {
    backgroundColor: "#ffebee",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#c62828", fontSize: 14 },

  section: { marginBottom: 20 },
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
    padding: 16,
    gap: 12,
  },

  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  readOnlyField: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },

  saveBtn: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnDisabled: { backgroundColor: "#555" },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },

  accountItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  accountItemText: { fontSize: 15 },

  passwordSection: { gap: 10, paddingVertical: 8 },

  activityRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  activityItem: { alignItems: "center", flex: 1 },
  activityValue: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  activityLabel: { fontSize: 12 },
  activityDivider: { width: 1, height: "100%" },

  logoutBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffebee",
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#ffebee",
  },
  logoutText: { color: "#c62828", fontSize: 16, fontWeight: "600" },
});
