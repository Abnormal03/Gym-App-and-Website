import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenHeader } from "../../src/components/common/ScreenHeader";
import type { ThemePalette } from "../../src/constants/colors";
import { getPhysiotherapistProfile } from "../../src/data/physiotherapists";
import { useTheme } from "../../src/hooks/useTheme";

export default function PhysiotherapistProfileScreen() {
  const { physiotherapistId } = useLocalSearchParams<{
    physiotherapistId: string;
  }>();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const id = Number(physiotherapistId);
  const physiotherapist = Number.isInteger(id)
    ? getPhysiotherapistProfile(id)
    : undefined;

  if (!physiotherapist) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Physiotherapist not found</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const reviews = showAllReviews
    ? physiotherapist.reviews
    : physiotherapist.reviews.slice(0, 2);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="Physiotherapist Profile" />

          <View style={styles.hero}>
            <View style={styles.providerSummary}>
              {physiotherapist.profilePhotoUrl ? (
                <Image
                  source={{ uri: physiotherapist.profilePhotoUrl }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoInitial}>
                    {physiotherapist.name.charAt(0)}
                  </Text>
                </View>
              )}
              {physiotherapist.verificationStatus === "VERIFIED" && (
                <View style={styles.verifiedMark}>
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color={theme.success}
                  />
                </View>
              )}
              <View style={styles.providerInfo}>
                <Text style={styles.name}>{physiotherapist.name}</Text>
                <Text style={styles.specialty}>
                  {physiotherapist.specialtyLabel}
                </Text>
              </View>
            </View>

            <View style={styles.stats}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  <Text style={styles.star}>★ </Text>
                  {physiotherapist.rating.toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>
                  {physiotherapist.reviewCount} REVIEWS
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {physiotherapist.experienceYears === null
                    ? "— Yrs"
                    : `${physiotherapist.experienceYears}+ Yrs`}
                </Text>
                <Text style={styles.statLabel}>EXP</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, styles.highlight]}>
                  {physiotherapist.sessionCount}+
                </Text>
                <Text style={styles.statLabel}>SESSIONS</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionTitleWrap}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>PROVIDER BIO</Text>
              </View>
              <Text style={styles.sectionEyebrow}>CLINICAL PROFILE</Text>
            </View>
            <View style={styles.bioCard}>
              <Text style={styles.biography}>{physiotherapist.biography}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>SESSION PRICE</Text>
                <Text style={styles.priceValue}>
                  {physiotherapist.sessionPrice
                    ? `${physiotherapist.sessionPrice} ETB`
                    : "Price unavailable"}
                </Text>
              </View>
              <View style={styles.verificationBadges}>
                {physiotherapist.verificationStatus === "VERIFIED" ? (
                  <>
                    <View style={styles.verificationBadge}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={17}
                        color={theme.success}
                      />
                      <Text style={styles.badgeText}>PHONE VERIFIED</Text>
                    </View>
                    <View style={styles.verificationBadge}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={17}
                        color={theme.success}
                      />
                      <Text style={styles.badgeText}>EMAIL VERIFIED</Text>
                    </View>
                  </>
                ) : (
                  <View style={[styles.verificationBadge, styles.pendingBadge]}>
                    <Ionicons
                      name="time-outline"
                      size={17}
                      color={theme.muted}
                    />
                    <Text style={styles.badgeText}>VERIFICATION PENDING</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.reviewsSection}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionTitleWrap}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>PATIENT REVIEWS</Text>
              </View>
              <Text style={styles.overallRating}>
                <Text style={styles.star}>★ </Text>
                {physiotherapist.rating.toFixed(2)}
                <Text style={styles.reviewTotal}>
                  {" "}
                  ({physiotherapist.reviewCount})
                </Text>
              </Text>
            </View>

            <View style={styles.reviewList}>
              {reviews.map((review) => (
                <View
                  key={`${review.reviewer}-${review.date}`}
                  style={styles.reviewCard}
                >
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewer}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerInitials}>
                          {review.initials}
                        </Text>
                      </View>
                      <View style={styles.reviewerInfo}>
                        <Text style={styles.reviewerName}>
                          {review.reviewer}
                        </Text>
                        <Text style={styles.reviewDate}>{review.date}</Text>
                      </View>
                    </View>
                    <Text style={styles.reviewStars}>★★★★★</Text>
                  </View>
                  <Text style={styles.reviewComment}>“{review.comment}”</Text>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showAllReviews }}
              onPress={() => setShowAllReviews((current) => !current)}
              style={styles.allReviewsButton}
            >
              <Text style={styles.allReviewsText}>
                {showAllReviews
                  ? "Show fewer reviews"
                  : `View all ${physiotherapist.reviewCount} reviews`}
              </Text>
              <Ionicons
                name={showAllReviews ? "chevron-up" : "chevron-forward"}
                size={18}
                color={theme.primary}
              />
            </Pressable>
          </View>
        </ScrollView>
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
    hero: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 28,
      backgroundColor: theme.input,
      gap: 22,
    },
    providerSummary: {
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
    verifiedMark: {
      position: "absolute",
      left: 76,
      bottom: 0,
      width: 34,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.card,
    },
    providerInfo: { flex: 1, gap: 6 },
    name: {
      color: theme.foreground,
      fontSize: 24,
      fontWeight: "800",
    },
    specialty: {
      color: theme.primary,
      fontFamily: "monospace",
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1,
      lineHeight: 17,
    },
    stats: { flexDirection: "row", gap: 10 },
    statCard: {
      flex: 1,
      minHeight: 86,
      paddingVertical: 13,
      paddingHorizontal: 5,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.card,
    },
    statValue: {
      color: theme.foreground,
      fontSize: 19,
      fontWeight: "800",
      textAlign: "center",
    },
    star: { color: theme.success },
    statLabel: {
      marginTop: 3,
      color: theme.muted,
      fontFamily: "monospace",
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.5,
      textAlign: "center",
    },
    highlight: { color: theme.success },
    section: { paddingHorizontal: 20, paddingTop: 24 },
    sectionHeading: {
      minHeight: 28,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 12,
    },
    sectionTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sectionAccent: {
      width: 6,
      height: 20,
      borderRadius: 4,
      backgroundColor: theme.primary,
    },
    sectionTitle: {
      color: theme.foreground,
      fontSize: 20,
      fontWeight: "800",
    },
    sectionEyebrow: {
      color: theme.muted,
      fontFamily: "monospace",
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.5,
    },
    bioCard: {
      padding: 19,
      borderRadius: 14,
      backgroundColor: theme.card,
      gap: 20,
    },
    biography: {
      color: theme.muted,
      fontSize: 17,
      lineHeight: 27,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.border,
    },
    priceLabel: {
      color: theme.muted,
      fontFamily: "monospace",
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1,
    },
    priceValue: {
      color: theme.success,
      fontSize: 16,
      fontWeight: "800",
    },
    verificationBadges: { flexDirection: "row", gap: 10 },
    pendingBadge: {
      flex: 1,
      justifyContent: "flex-start",
      paddingHorizontal: 14,
    },
    verificationBadge: {
      flex: 1,
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: 24,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      backgroundColor: theme.input,
    },
    badgeText: {
      color: theme.foreground,
      fontFamily: "monospace",
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.7,
    },
    reviewsSection: { paddingHorizontal: 20, paddingTop: 32 },
    overallRating: {
      color: theme.foreground,
      fontSize: 16,
      fontWeight: "700",
    },
    reviewTotal: { color: theme.muted, fontWeight: "400" },
    reviewList: { gap: 14 },
    reviewCard: {
      padding: 17,
      borderRadius: 14,
      backgroundColor: theme.card,
      gap: 12,
    },
    reviewHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    reviewer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    reviewerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.input,
    },
    reviewerInitials: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: "800",
    },
    reviewerInfo: { gap: 2 },
    reviewerName: {
      color: theme.foreground,
      fontSize: 16,
      fontWeight: "800",
    },
    reviewDate: {
      color: theme.muted,
      fontFamily: "monospace",
      fontSize: 12,
      letterSpacing: 0.8,
    },
    reviewStars: {
      color: theme.success,
      fontSize: 16,
      letterSpacing: -1,
    },
    reviewComment: {
      color: theme.muted,
      fontSize: 16,
      lineHeight: 26,
    },
    allReviewsButton: {
      minHeight: 52,
      marginTop: 14,
      borderRadius: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      backgroundColor: theme.card,
    },
    allReviewsText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    notFound: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 16,
    },
    notFoundTitle: {
      color: theme.foreground,
      fontSize: 22,
      fontWeight: "700",
    },
    backButton: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.card,
    },
    backButtonText: {
      color: theme.primary,
      fontWeight: "700",
    },
  });
