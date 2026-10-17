// app/(drawer)/(tabs)/_layout.tsx
import { Tabs, useRouter } from "expo-router";
import {
  TouchableOpacity,
  Text,
  View,
  Pressable,
  StyleSheet,
  ColorValue,
  Animated,
  Easing,
  LayoutChangeEvent,
} from "react-native";
import { DrawerToggleButton } from "expo-router/drawer";
import { useTheme } from "../../../../src/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState, type ComponentProps } from "react";

export default function TabsLayout() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Tabs
        tabBar={(props) => <MovingTabBar {...props} />}
        screenOptions={{
          animation: "fade",
          headerLeft: () => <DrawerToggleButton tintColor={theme.foreground} />,
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
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="home" color={color} focused={focused} />
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
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="book" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: "Chats",
            tabBarLabel: "Chats",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="chat" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarLabel: "Profile",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="account-circle" color={color} focused={focused} />
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

function MovingTabBar({ state, descriptors, navigation }: any) {
  const { theme } = useTheme();
  const [barWidth, setBarWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const activeIndex = state.index;
  const tabWidth = barWidth / Math.max(state.routes.length, 1);
  const indicatorWidth = 54;
  const onLayout = (event: LayoutChangeEvent) =>
    setBarWidth(event.nativeEvent.layout.width);

  useEffect(() => {
    if (!barWidth) return;
    Animated.spring(translateX, {
      toValue: activeIndex * tabWidth + (tabWidth - indicatorWidth) / 2,
      useNativeDriver: true,
      speed: 18,
      bounciness: 7,
    }).start();
  }, [activeIndex, barWidth, tabWidth, translateX]);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.tabBar,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      {barWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeBubble,
            {
              width: indicatorWidth,
              backgroundColor: theme.primary,
              shadowColor: theme.primary,
              transform: [{ translateX }],
            },
          ]}
        />
      )}
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label =
          typeof options.tabBarLabel === "string"
            ? options.tabBarLabel
            : (options.title ?? route.name);
        const color = focused ? theme.foreground : theme.subtle;
        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented)
            navigation.navigate(route.name, route.params);
        };
        const onLongPress = () =>
          navigation.emit({ type: "tabLongPress", target: route.key });
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            <View style={styles.tabIconSlot}>
              {options.tabBarIcon?.({
                focused,
                color,
                size: focused ? 27 : 24,
              })}
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.tabLabel,
                { color: focused ? theme.primary : theme.subtle },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabIcon({
  name,
  color,
  focused,
}: {
  name: ComponentProps<typeof MaterialIcons>["name"];
  color: ColorValue;
  focused: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.tabIcon,
        focused && {
          backgroundColor: "transparent",
          shadowColor: theme.primary,
          elevation: 8,
        },
      ]}
    >
      <MaterialIcons
        name={name}
        size={focused ? 30 : 24}
        color={focused ? theme.foreground : color}
        style={{ bottom: focused ? 5 : 0 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 8,
    height: 76,
    paddingTop: 2,
    paddingBottom: 8,
    borderWidth: 1,
    borderRadius: 22,
    elevation: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    overflow: "visible",
  },
  activeBubble: {
    position: "absolute",
    top: -4,
    left: 0,
    height: 54,
    borderRadius: 27,
    elevation: 12,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    marginHorizontal: 4,
    paddingTop: 5,
  },
  tabIconSlot: { height: 38, alignItems: "center", justifyContent: "center" },
  tabLabel: { fontSize: 13, fontWeight: "600", marginTop: 1 },
  chatbotButton: {
    position: "absolute",
    right: 18,
    bottom: 90,
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
  tabIcon: {
    width: 48,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
});
