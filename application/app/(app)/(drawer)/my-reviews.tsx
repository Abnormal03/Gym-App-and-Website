import { useCallback, useState } from "react";
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../src/hooks/useTheme";
import { reviewService } from "../../../src/services/review.service";
import type { MemberReview } from "../../../src/types/review.types";
import type { ThemePalette } from "../../../src/constants/colors";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-ET", {
    timeZone: "Africa/Addis_Ababa", dateStyle: "medium",
  });

export default function MyReviewsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [reviews, setReviews] = useState<MemberReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try { setReviews(await reviewService.getMine()); }
    catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace("/(drawer)/(tabs)/profile")} style={styles.back}>
          <MaterialIcons name="arrow-back" size={22} color={theme.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>My Ratings & Reviews</Text>
          <Text style={styles.subtitle}>Reviews you’ve submitted for completed sessions</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />
      }>
        {loading ? (
          <View style={styles.state}><ActivityIndicator size="large" color={theme.primary} /><Text style={styles.muted}>Loading your reviews…</Text></View>
        ) : error ? (
          <View style={styles.state}>
            <MaterialIcons name="error-outline" size={36} color={theme.error} />
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity onPress={() => void load()} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.state}>
            <MaterialIcons name="rate-review" size={40} color={theme.subtle} />
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.muted}>After a provider completes your session, leave a rating from My Sessions.</Text>
          </View>
        ) : reviews.map((review) => (
          <View key={review.id} style={styles.card}>
            <View style={styles.providerRow}>
              <View style={styles.avatar}><MaterialIcons name="fitness-center" size={20} color={theme.primary} /></View>
              <View style={styles.providerCopy}>
                <Text style={styles.providerName}>{review.provider.name}</Text>
                <Text style={styles.providerType}>{review.provider.type.replace(/_/g, " ")}</Text>
              </View>
              <View style={styles.rating}><MaterialIcons name="star" size={17} color={theme.primary} /><Text style={styles.ratingText}>{review.rating}/5</Text></View>
            </View>
            <Text style={styles.sessionMeta}>{review.session.booking.gym.name}{review.session.booking.package ? " · " + review.session.booking.package.name : ""}</Text>
            <Text style={styles.sessionMeta}>Session {formatDate(review.session.startsAt)} · Reviewed {formatDate(review.createdAt)}</Text>
            {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : <Text style={styles.noComment}>No written comment</Text>}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemePalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 16 },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  headerCopy: { flex: 1 },
  title: { color: theme.foreground, fontSize: 20, fontWeight: "800" },
  subtitle: { color: theme.muted, fontSize: 12, marginTop: 3 },
  content: { padding: 16, paddingBottom: 32, flexGrow: 1, gap: 12 },
  state: { flex: 1, minHeight: 250, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  muted: { color: theme.muted, textAlign: "center", lineHeight: 20 },
  error: { color: theme.error, textAlign: "center" },
  emptyTitle: { color: theme.foreground, fontSize: 18, fontWeight: "700" },
  retry: { backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
  card: { padding: 16, gap: 11, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  providerRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: theme.input },
  providerCopy: { flex: 1 },
  providerName: { color: theme.foreground, fontSize: 15, fontWeight: "700" },
  providerType: { color: theme.muted, fontSize: 12, marginTop: 3 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { color: theme.foreground, fontWeight: "700" },
  sessionMeta: { color: theme.muted, fontSize: 12 },
  comment: { color: theme.foreground, fontSize: 14, lineHeight: 21, paddingTop: 9, borderTopWidth: 1, borderTopColor: theme.border },
  noComment: { color: theme.subtle, fontSize: 12, fontStyle: "italic" },
});
