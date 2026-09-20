// app/(drawer)/(tabs)/_layout.tsx
import { Tabs, useRouter } from "expo-router";
import { TouchableOpacity, Text } from "react-native";
import { DrawerToggleButton } from "expo-router/drawer";
import { useTheme } from "../../../src/hooks/useTheme";

export default function TabsLayout() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.subtle,
        headerLeft: () => <DrawerToggleButton tintColor={theme.foreground} />,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
        },
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.foreground,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>,
          // DrawerToggleButton replaces the manual hamburger + DrawerActions
          headerLeft: () => <DrawerToggleButton tintColor={theme.foreground} />,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={{ paddingRight: 16 }}
            >
              <Text style={{ fontSize: 20 }}>⚙️</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          title: "My Bookings",
          tabBarLabel: "Bookings",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📅</Text>,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
