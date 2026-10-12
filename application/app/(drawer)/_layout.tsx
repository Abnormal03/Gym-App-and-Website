// app/(drawer)/_layout.tsx
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Drawer, DrawerContentScrollView } from "expo-router/drawer";
import { usePathname, useRouter } from "expo-router";
import { useAuthStore } from "../../src/store/auth.store";
import { useTheme } from "../../src/hooks/useTheme";
import type { ThemePalette } from "../../src/constants/colors";
import React from "react";
import { MaterialIcons } from "@expo/vector-icons";

// Define props locally — no longer imported from @react-navigation/drawer
interface DrawerContentProps {
  navigation: {
    closeDrawer: () => void;
  };
}

function DrawerContent({ navigation }: DrawerContentProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme } = useTheme();

  const pathName = usePathname();

  const navigate = (path: string) => {
    navigation.closeDrawer();
    router.push(path as any);
  };

  const handleLogout = async () => {
    navigation.closeDrawer();
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <DrawerContentScrollView
      contentContainerStyle={[
        styles.drawerContainer,
        { backgroundColor: theme.background },
      ]}
    >
      {/* User Info Header */}
      <View
        style={[
          styles.userSection,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <View style={[styles.avatarCircle, { backgroundColor: theme.input }]}>
          {user?.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarInitial, { color: theme.primary }]}>
              {user?.name?.charAt(0).toUpperCase() ?? "U"}
            </Text>
          )}
        </View>
        <Text
          style={[styles.userName, { color: theme.foreground }]}
          numberOfLines={1}
        >
          {user?.name ?? "User"}
        </Text>
        <Text
          style={[styles.userEmail, { color: theme.muted }]}
          numberOfLines={1}
        >
          {user?.email ?? ""}
        </Text>
      </View>

      {/* Main Navigation */}
      <View style={styles.navSection}>
        <DrawerItem
          icon={
            <MaterialIcons
              name="home"
              size={25}
              color={pathName === "/" ? theme.primary : theme.foreground}
            />
          }
          currentPath={pathName}
          path="/"
          label="Home"
          onPress={() => navigate("/(drawer)/(tabs)/")}
          theme={theme}
        />
        <DrawerItem
          icon={
            <MaterialIcons
              name="calendar-today"
              size={25}
              color={theme.foreground}
            />
          }
          path="bookings"
          currentPath={pathName}
          label="My Bookings"
          onPress={() => navigate("/(drawer)/(tabs)/bookings")}
          theme={theme}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Secondary */}
      <View style={styles.navSection}>
        <DrawerItem
          icon="⚙️"
          label="Settings"
          path="settings"
          currentPath={pathName}
          onPress={() => navigate("/settings")}
          theme={theme}
        />
        <DrawerItem
          icon="❓"
          label="Help & Support"
          onPress={() => navigate("/settings")}
          theme={theme}
        />
        <DrawerItem
          icon="📄"
          label="Terms of Service"
          onPress={() => navigate("/settings")}
          theme={theme}
        />
        <DrawerItem
          icon="🔒"
          label="Privacy Policy"
          onPress={() => navigate("/settings")}
          theme={theme}
        />
      </View>

      {/* Logout */}
      <View style={styles.logoutSection}>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={[styles.logoutText, { color: theme.error }]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

const DrawerItem = ({
  icon,
  label,
  onPress,
  theme,
  currentPath,
  path,
}: {
  icon: string | React.ReactNode;
  label: string;
  onPress: () => void;
  theme: ThemePalette;
  currentPath?: string;
  path?: string;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.drawerItem}>
    <Text style={styles.drawerItemIcon}>{icon}</Text>
    <Text
      style={[
        styles.drawerItemLabel,
        {
          color: currentPath?.endsWith(path || "")
            ? theme.primary
            : theme.foreground,
        },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default function DrawerLayout() {
  const { theme } = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: 300,
          backgroundColor: theme.background,
        },
        swipeEnabled: true,
        swipeEdgeWidth: 50,
      }}
    />
  );
}

const styles = StyleSheet.create({
  drawerContainer: { flex: 1 },

  userSection: {
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 1,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  avatarImage: { width: 60, height: 60, borderRadius: 30 },
  avatarInitial: { fontSize: 24, fontWeight: "700" },
  userName: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  userEmail: { fontSize: 13 },

  divider: { height: 1, marginHorizontal: 16 },
  navSection: { paddingVertical: 8 },

  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 16,
  },
  drawerItemIcon: { fontSize: 18, width: 24, textAlign: "center" },
  drawerItemLabel: { fontSize: 15, fontWeight: "500" },

  logoutSection: { marginTop: "auto", paddingBottom: 32 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 16,
  },
  logoutIcon: { fontSize: 18, width: 24, textAlign: "center" },
  logoutText: { fontSize: 15, fontWeight: "500" },
});
