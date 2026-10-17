import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { ThemePalette } from "../../constants/colors";

type SkeletonTheme = Pick<ThemePalette, "card" | "border" | "skeleton" | "input">;
type CardVariant = "booking" | "session" | "provider";

export function SkeletonList({ theme }: { theme: SkeletonTheme }) {
  return (
    <View style={styles.gymList} accessibilityLabel="Loading gyms">
      {[1, 2, 3].map((item) => (
        <View key={item} style={[styles.gymCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Block style={[styles.gymPhoto, { backgroundColor: theme.skeleton }]} />
          <View style={styles.gymInfo}>
            <Block style={[styles.line, { backgroundColor: theme.skeleton, width: "60%" }]} />
            <Block style={[styles.lineSmall, { backgroundColor: theme.skeleton, width: "42%" }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SkeletonCards({ theme, rows = 3, variant = "session" }: { theme: SkeletonTheme; rows?: number; variant?: CardVariant }) {
  return (
    <View style={styles.cards} accessibilityLabel="Loading content">
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {variant === "booking" ? <BookingCardSkeleton theme={theme} /> : null}
          {variant === "session" ? <SessionCardSkeleton theme={theme} /> : null}
          {variant === "provider" ? <ProviderCardSkeleton theme={theme} /> : null}
        </View>
      ))}
    </View>
  );
}

export function GymDetailSkeleton({ theme }: { theme: SkeletonTheme }) {
  return (
    <View style={styles.detail} accessibilityLabel="Loading gym details">
      <Block style={[styles.gymHero, { backgroundColor: theme.skeleton }]} />
      <Block style={[styles.line, { backgroundColor: theme.skeleton, width: "64%" }]} />
      <Block style={[styles.lineSmall, { backgroundColor: theme.skeleton, width: "84%" }]} />
      <View style={styles.inline}>
        <Block style={[styles.pill, { backgroundColor: theme.skeleton, width: 118 }]} />
        <Block style={[styles.pill, { backgroundColor: theme.skeleton, width: 94 }]} />
      </View>
      <Block style={[styles.sectionTitle, { backgroundColor: theme.skeleton, width: 112 }]} />
      {[1, 2].map((row) => (
        <View key={row} style={[styles.packageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Block style={[styles.line, { backgroundColor: theme.skeleton, width: "54%" }]} />
          <Block style={[styles.lineSmall, { backgroundColor: theme.skeleton, width: "82%" }]} />
        </View>
      ))}
    </View>
  );
}

export function ProviderDetailSkeleton({ theme }: { theme: SkeletonTheme }) {
  return (
    <View style={styles.detail} accessibilityLabel="Loading provider profile">
      <View style={[styles.providerHero, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Block style={[styles.avatar, { backgroundColor: theme.skeleton }]} />
        <Block style={[styles.line, { backgroundColor: theme.skeleton, width: "62%" }]} />
        <Block style={[styles.lineSmall, { backgroundColor: theme.skeleton, width: "42%" }]} />
      </View>
      <Block style={[styles.sectionTitle, { backgroundColor: theme.skeleton, width: 132 }]} />
      <Block style={[styles.bioLine, { backgroundColor: theme.skeleton }]} />
      <Block style={[styles.bioLine, { backgroundColor: theme.skeleton, width: "82%" }]} />
      <Block style={[styles.sectionTitle, { backgroundColor: theme.skeleton, width: 142, marginTop: 12 }]} />
      {[1, 2].map((row) => (
        <View key={row} style={[styles.packageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Block style={[styles.line, { backgroundColor: theme.skeleton, width: "52%" }]} />
          <Block style={[styles.lineSmall, { backgroundColor: theme.skeleton, width: "74%" }]} />
        </View>
      ))}
    </View>
  );
}

export function BookingDetailSkeleton({ theme }: { theme: SkeletonTheme }) {
  return (
    <View style={styles.detail} accessibilityLabel="Loading booking details">
      <View style={[styles.packageCard, styles.bookingSummary, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Block style={[styles.line, { backgroundColor: theme.skeleton, width: "66%" }]} />
        <Block style={[styles.lineSmall, { backgroundColor: theme.skeleton, width: "88%" }]} />
        <Block style={[styles.divider, { backgroundColor: theme.border }]} />
        {[1, 2, 3].map((row) => <Block key={row} style={[styles.rowLine, { backgroundColor: theme.skeleton }]} />)}
      </View>
      <Block style={[styles.sectionTitle, { backgroundColor: theme.skeleton, width: 118 }]} />
      <View style={[styles.timelineCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {[1, 2, 3].map((row) => (
          <View key={row} style={styles.timelineRow}>
            <Block style={[styles.dot, { backgroundColor: theme.skeleton }]} />
            <View style={styles.timelineCopy}>
              <Block style={[styles.lineSmall, { backgroundColor: theme.skeleton, width: "62%" }]} />
              <Block style={[styles.lineTiny, { backgroundColor: theme.skeleton, width: "42%" }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function BookingCardSkeleton({ theme }: { theme: SkeletonTheme }) {
  return <>
    <View style={styles.bookingRow}>
      <Block style={[styles.bookingPhoto, { backgroundColor: theme.skeleton }]} />
      <View style={styles.copy}>
        <Block style={[styles.line, { backgroundColor: theme.skeleton, width: "72%" }]} />
        <Block style={[styles.lineSmall, { backgroundColor: theme.skeleton, width: "54%" }]} />
        <Block style={[styles.lineTiny, { backgroundColor: theme.skeleton, width: "86%" }]} />
        <Block style={[styles.lineTiny, { backgroundColor: theme.skeleton, width: "65%" }]} />
      </View>
    </View>
    <Block style={[styles.action, { backgroundColor: theme.skeleton }]} />
  </>;
}

function SessionCardSkeleton({ theme }: { theme: SkeletonTheme }) {
  return <>
    <Block style={[styles.line, { backgroundColor: theme.skeleton, width: "64%" }]} />
    <Block style={[styles.lineSmall, { backgroundColor: theme.skeleton, width: "78%" }]} />
    <Block style={[styles.lineSmall, { backgroundColor: theme.skeleton, width: "54%" }]} />
    <View style={styles.inline}>
      <Block style={[styles.pill, { backgroundColor: theme.skeleton, width: 84 }]} />
      <Block style={[styles.action, { backgroundColor: theme.skeleton, width: 122 }]} />
    </View>
  </>;
}

function ProviderCardSkeleton({ theme }: { theme: SkeletonTheme }) {
  return <>
    <View style={styles.providerRow}>
      <Block style={[styles.avatar, { backgroundColor: theme.skeleton }]} />
      <View style={styles.copy}>
        <Block style={[styles.line, { backgroundColor: theme.skeleton, width: "72%" }]} />
        <Block style={[styles.lineTiny, { backgroundColor: theme.skeleton, width: "38%" }]} />
      </View>
    </View>
    <Block style={[styles.lineSmall, { backgroundColor: theme.skeleton, width: "88%" }]} />
    <Block style={[styles.action, { backgroundColor: theme.skeleton, width: "54%" }]} />
  </>;
}

function Block({ style }: { style: StyleProp<ViewStyle> }) {
  return <View style={style} />;
}

const styles = StyleSheet.create({
  gymList: { gap: 22 },
  gymCard: { height: 290, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  gymPhoto: { height: 182 },
  gymInfo: { padding: 18, gap: 16 },
  cards: { padding: 16, gap: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 13 },
  detail: { padding: 20, gap: 16 },
  gymHero: { height: 220, borderRadius: 16 },
  line: { height: 16, borderRadius: 7 },
  lineSmall: { height: 13, borderRadius: 6 },
  lineTiny: { height: 10, borderRadius: 5 },
  sectionTitle: { height: 17, borderRadius: 6, marginTop: 4 },
  pill: { height: 29, borderRadius: 16 },
  inline: { flexDirection: "row", alignItems: "center", gap: 10 },
  packageCard: { borderWidth: 1, borderRadius: 13, padding: 15, gap: 12 },
  providerHero: { borderWidth: 1, borderRadius: 16, alignItems: "center", padding: 20, gap: 12 },
  avatar: { width: 62, height: 62, borderRadius: 31 },
  bioLine: { height: 12, borderRadius: 6, width: "96%" },
  bookingSummary: { gap: 16 },
  divider: { height: 1, width: "100%" },
  rowLine: { height: 12, width: "92%", borderRadius: 6 },
  timelineCard: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 16 },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dot: { width: 20, height: 20, borderRadius: 10 },
  timelineCopy: { flex: 1, gap: 8 },
  bookingRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  bookingPhoto: { width: 86, height: 92, borderRadius: 10 },
  providerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1, gap: 9 },
  action: { height: 36, borderRadius: 9, marginTop: 3, width: "100%" },
});
