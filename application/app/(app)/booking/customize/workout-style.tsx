import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../../src/hooks/useTheme";
import { Button } from "../../../../src/components/common/Button";
import { ScreenHeader } from "../../../../src/components/common/ScreenHeader";
import { useBookingStore } from "../../../../src/store/booking.store";
import { router } from "expo-router";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";

type AddOn = {
  id: string;
  title: string;
  badge: string;
  accent: string;
};

const addOns: AddOn[] = [
  {
    id: "trainer",
    title: "Personal Trainer",
    badge: "MOST POPULAR",
    accent: "#2E68F4",
  },
  {
    id: "physio",
    title: "Physiotherapist",
    badge: "RECOVERY & MOBILITY",
    accent: "#d90024",
  },
  {
    id: "solo",
    title: "Self-Guided Session",
    badge: "INDEPENDENT",
    accent: "#00D99A",
  },
];

export default function CustomizeBookingPage() {
  const { theme, mode } = useTheme();
  const [selected, setSelected] = useState("trainer");

  const gymName = useBookingStore((state) => state.gymName);
  const clearSupportChoice = useBookingStore(
    (state) => state.clearSupportChoice,
  );

  const handleSubmit = async () => {
    try {
      await clearSupportChoice();
      if (selected === "trainer") {
        router.push("/booking/customize/trainer-list");
      } else if (selected === "physio") {
        router.push("/booking/customize/physiotherapist-list");
      } else {
        router.push("/booking/customize/nutrition-advisor");
      }
    } catch (error) {
      Alert.alert(
        "Unable to update booking choices",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="Customize Session" />

          <View style={styles.locationHeader}>
            <Text>
              <MaterialIcons name="my-location" color={theme.success} />{" "}
            </Text>
            <Text style={[styles.location, { color: theme.muted }]}>
              {gymName ?? "Selected gym"}
            </Text>
          </View>
          <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
            Professional Support
          </Text>

          <View style={styles.options}>
            {addOns.map((option) => {
              const isSelected = selected === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelected(option.id)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: isSelected
                        ? mode === "dark"
                          ? "#29344C"
                          : "#E8EEFF"
                        : theme.card,
                      borderColor: isSelected ? "transparent" : theme.card,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      {
                        backgroundColor: isSelected
                          ? option.accent
                          : mode === "dark"
                            ? "#2A2D32"
                            : "#EEF0F6",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.icon,
                        { color: isSelected ? "#FFFFFF" : option.accent },
                      ]}
                    >
                      {option.id === "solo" && (
                        <Feather name="headphones" size={30} />
                      )}
                      {option.id === "trainer" && (
                        <MaterialIcons name="fitness-center" size={30} />
                      )}
                      {option.id === "physio" && (
                        <Ionicons name="fitness" size={30} />
                      )}
                    </Text>
                  </View>
                  <View style={styles.optionCopy}>
                    <Text
                      style={[styles.optionTitle, { color: theme.foreground }]}
                    >
                      {option.title}
                    </Text>
                    <Text
                      style={[
                        styles.badge,
                        {
                          color: isSelected ? theme.success : theme.muted,
                          backgroundColor: isSelected
                            ? "#155E59"
                            : mode === "dark"
                              ? "#303138"
                              : "#E8E8EF",
                        },
                      ]}
                    >
                      {option.badge}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      {
                        backgroundColor: isSelected
                          ? theme.primary
                          : mode === "dark"
                            ? "#303238"
                            : "#DADCE6",
                      },
                    ]}
                  >
                    {isSelected ? <Text style={styles.check}>✓</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            { backgroundColor: theme.background, borderTopColor: theme.border },
          ]}
        >
          <Button
            mode={mode}
            title="CONTINUE"
            onPress={handleSubmit}
            style={[styles.continueButton]}
            textStyle={{ fontWeight: "500" }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
  content: { paddingBottom: 150 },
  location: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  locationHeader: {
    marginTop: 10,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  options: { gap: 16, paddingHorizontal: 20 },
  option: {
    minHeight: 80,
    borderRadius: 13,
    borderWidth: 1,
    padding: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: { fontSize: 25, fontWeight: "700" },
  optionCopy: { flex: 1, gap: 6 },
  optionTitle: { fontSize: 19, fontWeight: "600" },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  description: {
    marginTop: 8,
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 1.2,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  check: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 22,
    borderTopWidth: 1,
  },
  continueButton: { minHeight: 48, borderRadius: 8 },
});
