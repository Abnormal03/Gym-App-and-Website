import { useEffect, useState } from "react";
import {
  Platform,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "../../../../src/components/common/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { GymCard } from "../../../../src/components/gym/GymCard";
import { SkeletonList } from "../../../../src/components/gym/SkeletonLoading";
import { useGyms } from "../../../../src/hooks/useGym";
import { useRouter } from "expo-router";
import { useTheme } from "../../../../src/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

export function HomeScreen() {
  const { theme: palette, mode } = useTheme();
  const [search, setSearch] = useState<string>("");
  const theme = {
    ...palette,
    text: palette.foreground,
    nav: palette.card,
    skeleton: palette.border,
  };
  const router = useRouter();

  const {
    getGyms,
    gyms,
    loading: isLoading,
    error,
    searching,
    searchError,
    searchGymByNameAndLocation,
    getGymsNearMe,
    nearMe,
    nearMeLoading,
    nearMeError,
    nearMeExpanded,
  } = useGyms();

  useEffect(() => {
    getGyms();
  }, []);

  const handlePress = (id: number) => {
    router.push(`/gym/${id}`);
  };

  const handleSearch = async () => {
    if (search.trim().length === 0) {
      await getGyms();
    } else {
      await searchGymByNameAndLocation(search);
    }
  };

  const handleFailReload = () => {
    setSearch("");
    getGyms();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.viewport}>
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
              value={search}
              onChangeText={(text) => setSearch(text)}
              onSubmitEditing={handleSearch}
              placeholderTextColor={theme.muted}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
          <Button
            mode={mode}
            title={
              <MaterialIcons name="search" size={30} color={theme.foreground} />
            }
            accessibilityLabel="Search gyms"
            loading={searching}
            onPress={handleSearch}
            style={styles.mapButton}
          />
        </View>
        <View style={styles.nearMeRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: nearMe, disabled: nearMeLoading }}
            disabled={nearMeLoading}
            onPress={() => {
              setSearch("");
              if (nearMe) void getGyms();
              else void getGymsNearMe();
            }}
            style={[
              styles.nearMeButton,
              {
                backgroundColor: nearMe ? theme.primary : theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            {nearMeLoading ? (
              <ActivityIndicator
                size="small"
                color={nearMe ? theme.foreground : theme.primary}
              />
            ) : (
              <MaterialIcons
                name="near-me"
                size={19}
                color={nearMe ? theme.foreground : theme.primary}
              />
            )}
            <Text
              style={{
                color: nearMe ? theme.foreground : theme.text,
                fontWeight: "700",
              }}
            >
              {nearMe
                ? "Near me · " + (nearMeExpanded ? 25 : 10) + " km"
                : "Near me"}
            </Text>
          </Pressable>
          {nearMeError ? (
            <Text style={[styles.nearMeError, { color: theme.error }]}>
              {nearMeError}
            </Text>
          ) : null}
        </View>
        {searchError && (
          <View>
            <View
              style={{
                height: 30,
                borderWidth: 1,
                borderRadius: 10,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 10,
                marginHorizontal: 10,
              }}
            >
              <Text style={{ color: theme.error, textAlign: "center" }}>
                {searchError}
              </Text>
            </View>
            <Button
              title="Reload"
              mode={mode}
              onPress={handleFailReload}
              style={{
                height: 10,
                marginTop: 10,
                minHeight: 50,
                alignSelf: "center",
              }}
            />
          </View>
        )}
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isLoading || nearMeLoading}
              onRefresh={nearMe ? getGymsNearMe : getGyms}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <SkeletonList theme={theme} />
          ) : (
            <>
              <View style={styles.gymList}>
                {gyms.map((gym) => (
                  <GymCard
                    key={gym.id}
                    gym={gym}
                    theme={theme}
                    mode={mode}
                    onPress={() => handlePress(gym.id)}
                  />
                ))}
              </View>
            </>
          )}
          {error && (
            <View style={styles.errorState}>
              <Text style={[styles.errorText, { color: theme.text }]}>
                {error}
              </Text>
              <Button
                mode={mode}
                title="Retry"
                onPress={getGyms}
                loading={isLoading}
                style={styles.retryButton}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  viewport: {
    flex: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingBottom: 100,
  },
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
    paddingHorizontal: 15,
    marginTop: Platform.OS === "web" ? 20 : 0,
    marginBottom: 10,
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
  gymList: { gap: 22, marginTop: 10 },
  nearMeRow: {
    paddingHorizontal: 15,
    paddingTop: 10,
    position: "absolute",
    top: 75,
    zIndex: 100,
    right: 10,
  },
  nearMeButton: {
    alignSelf: "flex-start",
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 15,
    borderRadius: 22,
    borderWidth: 1,
  },
  nearMeError: { marginTop: 8, fontSize: 13 },
  errorState: { alignItems: "center", gap: 12, paddingVertical: 24 },
  errorText: { textAlign: "center", fontSize: 16 },
  retryButton: { minHeight: 48, borderRadius: 9 },
});

export default HomeScreen;
