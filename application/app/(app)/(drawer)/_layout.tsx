// app/(drawer)/_layout.tsx
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Drawer, DrawerContentScrollView } from "expo-router/drawer";
import { usePathname, useRouter } from "expo-router";
import { useAuthStore } from "../../../src/store/auth.store";
import { useTheme } from "../../../src/hooks/useTheme";
import type { ThemePalette } from "../../../src/constants/colors";
import React from "react";
import { MaterialIcons } from "@expo/vector-icons";

// Define props locally — no longer imported from @react-navigation/drawer
interface DrawerContentProps {
  navigation: {
    closeDrawer: () => void;
  };
}

type DrawerIconName = React.ComponentProps<typeof MaterialIcons>["name"];

function DrawerContent({ navigation }: DrawerContentProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme } = useTheme();

  const pathName = usePathname();
  const userInitials = user?.name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

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
        { backgroundColor: theme.card },
      ]}
    >
      {/* User Info Header */}
      <View
        style={[
          styles.userSection,
          { borderBottomColor: theme.border },
        ]}
      >
        <View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: `${theme.primary}18`,
            },
          ]}
        >
          {user?.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarInitial, { color: theme.primary }]}>
              {userInitials}
            </Text>
          )}
        </View>
        <View style={styles.userDetails}>
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
      </View>

      {/* Main Navigation */}
      <View style={styles.navSection}>
        <DrawerItem
          icon="home"
          currentPath={pathName}
          path="/"
          label="Home"
          onPress={() => navigate("/(drawer)/(tabs)/")}
          theme={theme}
        />
        <DrawerItem
          icon="calendar-today"
          path="bookings"
          currentPath={pathName}
          label="My Bookings"
          onPress={() => navigate("/(drawer)/(tabs)/bookings")}
          theme={theme}
        />
        <DrawerItem
          icon="fitness-center"
          path="sessions"
          currentPath={pathName}
          label="My Sessions"
          onPress={() => navigate("/sessions")}
          theme={theme}
        />
        <DrawerItem
          icon="receipt-long"
          path="payment-history"
          currentPath={pathName}
          label="Payment History"
          onPress={() => navigate("/payment-history")}
          theme={theme}
        />
        <DrawerItem
          icon="rate-review"
          path="my-reviews"
          currentPath={pathName}
          label="My Ratings & Reviews"
          onPress={() => navigate("/my-reviews")}
          theme={theme}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Secondary */}
      <View style={styles.navSection}>
        <DrawerItem
          icon="settings"
          label="Settings"
          path="settings"
          currentPath={pathName}
          onPress={() => navigate("/settings")}
          theme={theme}
        />
        <DrawerItem
          icon="help-outline"
          label="Help & Support"
          onPress={() => navigate("/settings")}
          theme={theme}
        />
        <DrawerItem
          icon="description"
          label="Terms of Service"
          onPress={() => navigate("/settings")}
          theme={theme}
        />
        <DrawerItem
          icon="lock-outline"
          label="Privacy Policy"
          onPress={() => navigate("/settings")}
          theme={theme}
        />
      </View>

      {/* Logout */}
      <View style={styles.logoutSection}>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutBtn}
        >
          <MaterialIcons name="logout" size={21} color={theme.error} />
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
  icon: DrawerIconName;
  label: string;
  onPress: () => void;
  theme: ThemePalette;
  currentPath?: string;
  path?: string;
}) => {
  const pathname = currentPath ?? "";
  const isActive = path
    ? path === "/"
      ? pathname === "/" || pathname.endsWith("/(tabs)")
      : pathname.endsWith(`/${path}`)
    : false;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={[
        styles.drawerItem,
        isActive && {
          backgroundColor: `${theme.primary}18`,
        },
      ]}
    >
      <View
        style={[
          styles.drawerItemIcon,
          { backgroundColor: "transparent" },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={21}
          color={isActive ? theme.primary : theme.muted}
        />
      </View>
      <Text
        style={[
          styles.drawerItemLabel,
          { color: isActive ? theme.primary : theme.foreground },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default function DrawerLayout() {
  const { theme } = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: 300,
          backgroundColor: theme.card,
          borderRightColor: theme.border,
          borderRightWidth: 1,
          elevation: 14,
        },
        overlayColor: "rgba(0,0,0,0.48)",
        swipeEnabled: true,
        swipeEdgeWidth: 50,
      }}
    />
  );
}

const styles = StyleSheet.create({
  drawerContainer: { flexGrow: 1 },

  userSection: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    marginHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarInitial: { fontSize: 14, fontWeight: "700" },
  userDetails: { flex: 1, minWidth: 0 },
  userName: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  userEmail: { fontSize: 10 },

  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  navSection: { paddingVertical: 8 },

  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 38,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginHorizontal: 12,
    marginVertical: 1,
    borderRadius: 10,
    gap: 11,
  },
  drawerItemIcon: {
    width: 22,
    height: 24,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerItemLabel: { fontSize: 12, fontWeight: "500" },

  logoutSection: { marginTop: "auto", paddingBottom: 16 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 42,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    gap: 11,
  },
  logoutText: { fontSize: 12, fontWeight: "600" },
});
