import { Tabs } from "expo-router";
import { Text, useColorScheme, type ColorValue } from "react-native";
import { colors } from "../../src/constants/colors";

const tabIcon = (label: string, color: ColorValue, active = false) => (
  <Text style={{ color, fontSize: 21, opacity: active ? 1 : 0.8 }}>
    {label}
  </Text>
);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const mode = colorScheme === "dark" ? "dark" : "light";
  const theme = colors[mode];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 0,
          height: 78,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarActiveTintColor: theme.foreground,
        tabBarInactiveTintColor: theme.subtle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Train",
          tabBarIcon: ({ color, focused }) => tabIcon("⚒", color, focused),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color, focused }) => tabIcon("▥", color, focused),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "Social",
          tabBarIcon: ({ color, focused }) => tabIcon("♟", color, focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => tabIcon("♙", color, focused),
        }}
      />
    </Tabs>
  );
}
