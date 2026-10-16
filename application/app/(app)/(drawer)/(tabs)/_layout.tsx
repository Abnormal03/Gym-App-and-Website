// app/(drawer)/(tabs)/_layout.tsx
import { Tabs, useRouter } from "expo-router";
import {
  TouchableOpacity,
  Text,
  View,
  Pressable,
  StyleSheet,
} from "react-native";
import { DrawerToggleButton } from "expo-router/drawer";
import { useTheme } from "../../../../src/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

export default function TabsLayout() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, height: 100 },
      ]}
    >
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.subtle,
          headerLeft: () => <DrawerToggleButton tintColor={theme.foreground} />,
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: "transparent",
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 22,
            marginHorizontal: 12,
            marginBottom: 8,
            height: 68,
            paddingTop: 6,
            paddingBottom: 8,
            elevation: 12,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.16,
            shadowRadius: 12,
          },
          tabBarItemStyle: { borderRadius: 16, marginHorizontal: 4 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
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
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="home" size={24} color={color} />
            ),
            headerLeft: () => (
              <DrawerToggleButton tintColor={theme.foreground} />
            ),
            headerRight: () => (
              <TouchableOpacity
                onPress={() => router.push("/settings")}
                style={{ paddingRight: 16 }}
                accessibilityRole="button"
                accessibilityLabel="Open settings"
              >
                <MaterialIcons
                  name="settings"
                  size={25}
                  color={theme.foreground}
                />
              </TouchableOpacity>
            ),
          }}
        />

        <Tabs.Screen
          name="bookings"
          options={{
            title: "My Bookings",
            tabBarLabel: "Bookings",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="book" color={color} size={24} />
            ),
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: "Chats",
            tabBarLabel: "Chats",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="chat" color={color} size={24} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="account-circle" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open fitness chatbot"
        onPress={() => router.push("/chatbot")}
        style={[styles.chatbotButton, { backgroundColor: theme.primary }]}
      >
        <MaterialIcons name="smart-toy" size={23} color={theme.foreground} />
        <Text style={[styles.chatbotButtonText, { color: theme.foreground }]}>
          Ask AI
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatbotButton: {
    position: "absolute",
    right: 18,
    bottom: 74,
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    zIndex: 10,
  },
  chatbotButtonText: { color: "#FFFFFF", fontWeight: "700" },
});
