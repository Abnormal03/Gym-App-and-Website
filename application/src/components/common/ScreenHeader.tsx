import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type ScreenHeaderProps = {
  title: string;
  onAccountPress?: () => void;
};

export function ScreenHeader({ title, onAccountPress }: ScreenHeaderProps) {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={styles.actionButton}
      >
        <MaterialIcons
          name="arrow-back-ios"
          size={23}
          color={theme.foreground}
        />
      </Pressable>
      <Text style={[styles.title, { color: theme.foreground }]}>{title}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open your profile"
        onPress={
          onAccountPress ?? (() => router.push("/(drawer)/(tabs)/profile"))
        }
        style={[
          styles.actionButton,
          styles.accountButton,
          {
            backgroundColor: theme.input,
            borderColor: theme.border,
          },
        ]}
      >
        <MaterialIcons name="person-outline" size={22} color={theme.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 70,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderBottomWidth: 1,
  },
  actionButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  accountButton: {
    borderRadius: 20,
    borderWidth: 1,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
  },
});
