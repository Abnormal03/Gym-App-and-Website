import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../common/ScreenHeader";
import type { ThemePalette } from "../../constants/colors";
import { useProviderDetails } from "../../hooks/useProviderDetails";
import { useProviderReviews } from "../../hooks/useProviderReviews";
import { useTheme } from "../../hooks/useTheme";
import { ProviderType } from "../../types/gym.types";

type ProviderProfileScreenProps = {
  providerId: number | null;
  type: ProviderType;
};

export function ProviderProfileScreen({
  providerId,
  type,
}: ProviderProfileScreenProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const {
    provider,
    loading,
    error,
    refetch,
  } = useProviderDetails(providerId, type);
  const {
    reviews,
    loading: reviewsLoading,
    error: reviewsError,
  } = useProviderReviews(provider?.id ?? null);
  const title =
    type === "TRAINER"
      ? "Trainer Profile"
      : type === "PHYSIOTHERAPIST"
        ? "Physiotherapist Profile"
        : "Nutrition Consultant Profile";
  const specialtyLabel =
    provider?.specializations.join(" · ") ||
    (type === "TRAINER"
      ? "Trainer"
      : type === "PHYSIOTHERAPIST"
        ? "Physiotherapist"
        : "Nutrition Consultant");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <ScreenHeader title={title} />
        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.stateText}>Loading provider profile…</Text>
          </View>
        ) : error || !provider ? (
          <View style={styles.state}>
            <Text style={styles.errorText}>
              {error ?? "Provider not found."}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refetch()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <View style={styles.summary}>
                {provider.photoUrl ? (
                  <Image
                    source={{ uri: provider.photoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoInitial}>
                      {provider.name.trim().charAt(0).toLocaleUpperCase() || "?"}
                    </Text>
                  </View>
                )}
                <View style={styles.providerInfo}>
                  <Text style={styles.name}>{provider.name}</Text>
                  <Text style={styles.specialty}>{specialtyLabel}</Text>
                </View>
              </View>
              <View style={styles.stats}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    <Text style={styles.star}>★ </Text>
                    {provider.ratingAvg.toFixed(2)}
                  </Text>
                  <Text style={styles.statLabel}>
                    {provider.ratingCount} REVIEWS
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {provider.experienceYears === null
                      ? "—"
                      : `${provider.experienceYears}+`}
                  </Text>
                  <Text style={styles.statLabel}>YEARS EXP</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, styles.highlight]}>
                    {provider.sessionsCompleted}
                  </Text>
                  <Text style={styles.statLabel}>SESSIONS</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>
                  {type === "TRAINER"
                    ? "TRAINER BIO"
                    : type === "PHYSIOTHERAPIST"
                      ? "PROVIDER BIO"
                      : "NUTRITION CONSULTANT BIO"}
                </Text>
              </View>
              <View style={styles.bioCard}>
                <Text style={styles.biography}>
                  {provider.bio?.trim() || "No biography provided."}
                </Text>
                {provider.certifications.length > 0 && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailLabel}>CERTIFICATIONS</Text>
                    <Text style={styles.detailValue}>
                      {provider.certifications.join(" · ")}
                    </Text>
                  </View>
                )}
                {provider.gym && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailLabel}>GYM</Text>
                    <Text style={styles.detailValue}>
                      {provider.gym.name}
                      {provider.gym.address ? ` · ${provider.gym.address}` : ""}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.reviewsSection}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>
                  {type === "TRAINER"
                    ? "ATHLETE REVIEWS"
                    : type === "PHYSIOTHERAPIST"
                      ? "PATIENT REVIEWS"
                      : "CLIENT REVIEWS"}
                </Text>
              </View>
              {reviewsLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : reviewsError ? (
                <Text style={styles.errorText}>{reviewsError}</Text>
              ) : reviews.length === 0 ? (
                <Text style={styles.emptyText}>No reviews yet.</Text>
              ) : (
                <>
                  <View style={styles.reviewList}>
                    {(showAllReviews ? reviews : reviews.slice(0, 3)).map(
                      (review) => {
                        const reviewer = review.reviewerFirstName || "Member";
                        const initials = reviewer
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part.charAt(0))
                          .join("")
                          .toLocaleUpperCase();
                        const date = new Date(review.createdAt);
                        const formattedDate = Number.isFinite(date.getTime())
                          ? date.toLocaleDateString()
                          : "";

                        return (
                          <View key={review.id} style={styles.reviewCard}>
                            <View style={styles.reviewHeader}>
                              <View style={styles.reviewer}>
                                <View style={styles.reviewerAvatar}>
                                  <Text style={styles.reviewerInitials}>
                                    {initials}
                                  </Text>
                                </View>
                                <View style={styles.reviewerInfo}>
                                  <Text style={styles.reviewerName}>
                                    {reviewer}
                                  </Text>
                                  <Text style={styles.reviewDate}>
                                    {formattedDate}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.reviewStars}>
                                {"★".repeat(
                                  Math.max(0, Math.min(5, review.rating)),
                                )}
                              </Text>
                            </View>
                            <Text style={styles.reviewComment}>
                              {review.comment?.trim() || "No written comment."}
                            </Text>
                          </View>
                        );
                      },
                    )}
                  </View>
                  {reviews.length > 3 && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showAllReviews }}
                      onPress={() => setShowAllReviews((current) => !current)}
                      style={styles.allReviewsButton}
                    >
                      <Text style={styles.allReviewsText}>
                        {showAllReviews
                          ? "Show fewer loaded reviews"
                          : `Show all ${reviews.length} loaded reviews`}
                      </Text>
                      <Ionicons
                        name={showAllReviews ? "chevron-up" : "chevron-forward"}
                        size={18}
                        color={theme.primary}
                      />
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    screen: {
      flex: 1,
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
      backgroundColor: theme.background,
    },
    content: { paddingBottom: 38 },
    state: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      padding: 24,
    },
    stateText: { color: theme.muted, fontSize: 15 },
    errorText: { color: theme.error, fontSize: 15, textAlign: "center" },
    retryButton: {
      borderRadius: 10,
      backgroundColor: theme.primary,
      paddingHorizontal: 20,
      paddingVertical: 11,
    },
    retryText: { color: "#FFFFFF", fontWeight: "700" },
    hero: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 28,
      backgroundColor: theme.input,
      gap: 22,
    },
    summary: {
      minHeight: 114,
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
    },
    photo: {
      width: 112,
      height: 112,
      borderRadius: 14,
      backgroundColor: theme.border,
    },
    photoPlaceholder: {
      width: 112,
      height: 112,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.card,
    },
    photoInitial: {
      color: theme.foreground,
      fontSize: 36,
      fontWeight: "700",
    },
    providerInfo: { flex: 1, gap: 6 },
    name: { color: theme.foreground, fontSize: 24, fontWeight: "800" },
    specialty: { color: theme.primary, fontSize: 12, fontWeight: "700" },
    stats: { flexDirection: "row", gap: 10 },
    statCard: {
      flex: 1,
      minHeight: 76,
      alignItems: "center",
      justifyContent: "center",
      padding: 8,
      borderRadius: 12,
      backgroundColor: theme.card,
    },
    statValue: { color: theme.foreground, fontSize: 17, fontWeight: "800" },
    statLabel: {
      marginTop: 4,
      color: theme.muted,
      fontSize: 9,
      fontWeight: "700",
      textAlign: "center",
    },
    star: { color: theme.primary },
    highlight: { color: theme.primary },
    section: { paddingHorizontal: 20, paddingTop: 30 },
    sectionHeading: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
    },
    sectionAccent: {
      width: 4,
      height: 18,
      borderRadius: 2,
      backgroundColor: theme.primary,
    },
    sectionTitle: {
      color: theme.foreground,
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    bioCard: {
      gap: 16,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    biography: { color: theme.foreground, fontSize: 15, lineHeight: 23 },
    detailBlock: { gap: 5 },
    detailLabel: {
      color: theme.muted,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    detailValue: { color: theme.foreground, fontSize: 14, lineHeight: 20 },
    reviewsSection: { paddingHorizontal: 20, paddingTop: 32 },
    reviewList: { gap: 12 },
    reviewCard: {
      gap: 12,
      padding: 15,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.card,
    },
    reviewHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    reviewer: { flexDirection: "row", alignItems: "center", gap: 10 },
    reviewerAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.input,
    },
    reviewerInitials: { color: theme.primary, fontWeight: "800" },
    reviewerInfo: { gap: 3 },
    reviewerName: { color: theme.foreground, fontSize: 14, fontWeight: "700" },
    reviewDate: { color: theme.muted, fontSize: 12 },
    reviewStars: { color: theme.primary, fontSize: 15 },
    reviewComment: { color: theme.foreground, fontSize: 14, lineHeight: 21 },
    emptyText: { color: theme.muted, paddingVertical: 8 },
    allReviewsButton: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
      paddingVertical: 8,
    },
    allReviewsText: { color: theme.primary, fontSize: 14, fontWeight: "700" },
  });
