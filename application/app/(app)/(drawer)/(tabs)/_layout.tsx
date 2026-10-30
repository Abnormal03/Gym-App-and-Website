import { Tabs, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "react";
import { useTheme } from "../../../../src/hooks/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_ICONS: Record<string, ComponentProps<typeof MaterialIcons>["name"]> = {
  index: "home",
  feed: "grid-view",
  bookings: "calendar-today",
  chats: "chat-bubble-outline",
  profile: "person-outline",
};

export default function TabsLayout() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Tabs
        tabBar={(props) => <MemberTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home", tabBarLabel: "Home" }} />
        <Tabs.Screen name="feed" options={{ title: "Feed", tabBarLabel: "Feed" }} />
        <Tabs.Screen name="bookings" options={{ title: "My Bookings", tabBarLabel: "Bookings" }} />
        <Tabs.Screen name="chats" options={{ title: "Chats", tabBarLabel: "Chats" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile", tabBarLabel: "Profile" }} />
      </Tabs>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open fitness assistant"
        onPress={() => router.push("/chatbot")}
        style={[styles.chatbotButton, { backgroundColor: theme.primary, bottom: 72 + Math.max(insets.bottom, 8) }]}
      >
        <MaterialIcons name="smart-toy" size={18} color="#FFFFFF" />
        <Text style={styles.chatbotButtonText}>Ask AI</Text>
      </Pressable>
    </View>
  );
}

function MemberTabBar({ state, descriptors, navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 62 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label = typeof options.tabBarLabel === "string"
          ? options.tabBarLabel
          : options.title ?? route.name;
        const color = focused ? theme.primary : theme.muted;
        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            style={styles.tabItem}
          >
            <MaterialIcons
              name={TAB_ICONS[route.name] ?? "circle"}
              size={21}
              color={color}
            />
            <Text numberOfLines={1} style={[styles.tabLabel, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 7,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 3,
    paddingTop: 1,
    paddingHorizontal: 2,
  },
  tabLabel: { fontSize: 12, fontWeight: "500" },
  chatbotButton: {
    position: "absolute",
    right: 15,
    minHeight: 38,
    borderRadius: 20,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    zIndex: 10,
  },
  chatbotButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
