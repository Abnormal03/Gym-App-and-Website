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
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            shadowColor: theme.primary,
          },
        ]}
      >
        <View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: theme.input,
              borderColor: theme.primary,
              shadowColor: theme.primary,
            },
          ]}
        >
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
          style={[
            styles.logoutBtn,
            { backgroundColor: theme.input, borderColor: theme.error + "55" },
          ]}
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
          backgroundColor: theme.primary + "14",
          borderColor: theme.primary + "66",
        },
      ]}
    >
      <View
        style={[
          styles.drawerItemIcon,
          { backgroundColor: isActive ? theme.primary + "20" : theme.input },
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
          backgroundColor: theme.background,
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
  drawerContainer: { flex: 1 },

  userSection: {
    margin: 12,
    marginTop: 20,
    padding: 20,
    borderWidth: 1,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    elevation: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginVertical: 3,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 16,
  },
  drawerItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerItemLabel: { fontSize: 15, fontWeight: "600" },

  logoutSection: { marginTop: "auto", paddingBottom: 32 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    gap: 16,
  },
  logoutText: { fontSize: 15, fontWeight: "500" },
});
