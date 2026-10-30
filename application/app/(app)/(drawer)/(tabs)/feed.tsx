import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../../src/hooks/useTheme";

export default function FeedScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.foreground }]}>Feed</Text>
        <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: `${theme.primary}16` }]}>
            <MaterialIcons name="grid-view" size={22} color={theme.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.foreground }]}>Your community feed is coming soon</Text>
          <Text style={[styles.emptyBody, { color: theme.muted }]}>Updates shared by gyms and trainers will appear here.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, padding: 20, paddingBottom: 100 },
  title: { fontSize: 20, fontWeight: "800", marginTop: 8, marginBottom: 18 },
  emptyCard: { minHeight: 240, alignItems: "center", justifyContent: "center", padding: 24, borderWidth: 1, borderRadius: 16 },
  iconCircle: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 24, marginBottom: 14 },
  emptyTitle: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptyBody: { maxWidth: 240, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 6 },
});
