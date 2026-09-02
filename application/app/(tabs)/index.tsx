import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../../src/constants/colors";
import { Button } from "../../src/components/common/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { GymCard } from "../../src/components/gym/GymCard";
import { SkeletonList } from "../../src/components/gym/SkeletonLoading";
import { useGyms } from "../../src/hooks/useGym";

type Props = { dark?: boolean };

export function HomeScreen({ dark = false }: Props) {
  const [themeDark] = useState(dark);
  const [activeFilter, setActiveFilter] = useState("Distance");
  const mode = themeDark ? "dark" : "light";
  const theme = {
    ...(themeDark ? colors.dark : colors.light),
    text: (themeDark ? colors.dark : colors.light).foreground,
    nav: themeDark ? colors.dark.card : colors.light.card,
    skeleton: themeDark ? colors.dark.border : colors.light.input,
  };

  const { getGyms, gyms, loading: isLoading, error } = useGyms();

  useEffect(() => {
    getGyms();
  }, []);

  const handlePress = (id: number) => {};

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.viewport}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Open menu">
            <Text style={[styles.headerIcon, { color: theme.text }]}>☰</Text>
          </Pressable>
          <Text style={[styles.logo, { color: theme.primary }]}>
            BOLE ELITE
          </Text>
          <Pressable accessibilityLabel="Open settings">
            <Text style={[styles.headerIcon, { color: theme.text }]}>⚙</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchBox,
                { backgroundColor: theme.input, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.searchIcon, { color: theme.muted }]}>⌕</Text>
              <TextInput
                placeholder="Find your arena..."
                placeholderTextColor={theme.muted}
                style={[styles.searchInput, { color: theme.text }]}
              />
            </View>
            <Button
              mode={mode}
              title="▣"
              onPress={() => undefined}
              style={styles.mapButton}
            />
          </View>
          {/* <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {["Distance", "Rating", "Price: low-high"].map((filter) => (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filter,
                  {
                    backgroundColor:
                      activeFilter === filter ? theme.primary : theme.input,
                    borderColor:
                      activeFilter === filter ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: activeFilter === filter ? "#fff" : theme.text,
                    fontFamily: "monospace",
                  }}
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView> */}
          {isLoading ? (
            <SkeletonList theme={theme} />
          ) : (
            <View style={styles.gymList}>
              {gyms.map((gym) => (
                <GymCard
                  key={gym.id}
                  gym={gym}
                  theme={theme}
                  mode={mode}
                  onPress={handlePress}
                />
              ))}
            </View>
          )}
          {error && (
            <View>
              <Text>Error happened while fetching available gyms...</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  viewport: { flex: 1, width: "100%", maxWidth: 640, alignSelf: "center" },
  header: {
    height: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  headerIcon: { fontSize: 24 },
  logo: { fontSize: 29, fontWeight: "900", letterSpacing: -1.5 },
  content: { padding: 16, paddingBottom: 32 },
  searchRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 30,
  },
  searchBox: {
    flex: 1,
    height: 54,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  searchIcon: { fontSize: 28, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  mapButton: {
    width: 48,
    minHeight: 54,
    paddingHorizontal: 0,
    borderRadius: 9,
  },
  mapText: { fontSize: 22 },
  filters: { gap: 6, paddingVertical: 16 },
  filter: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 17,
  },
  gymList: { gap: 22 },
});

export default HomeScreen;
