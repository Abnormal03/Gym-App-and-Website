import { Pressable, StyleSheet, type PressableProps } from "react-native";
import { Card } from "../common/Card";
import { View, Text, Image } from "react-native";
import { Gym } from "../../types/gym.types";

interface Props {
  gym: Gym;
  theme: any;
  mode: any;
  onPress: PressableProps["onPress"];
}

export function GymCard({ gym, theme, mode, onPress }: Props) {
  const isClosed = isGymClosed(gym);
  const amenitiesText = gym.amenities?.length
    ? gym.amenities.join(" • ")
    : "No amenities listed";

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card
        mode={mode}
        style={[
          styles.gymCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.photoWrap}>
          <Image source={{ uri: gym.photos[0] }} style={styles.photo} />
          <View style={[styles.openBadge, isClosed && styles.closedBadge]}>
            <Text style={[styles.openText, isClosed && styles.closedText]}>
              {isClosed ? "OPENS SOON" : "OPEN NOW"}
            </Text>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.gymName, { color: theme.text }]}>
              {gym.name}
            </Text>
            <Text style={[styles.meta, { color: theme.muted }]}>
              📍 {gym.address}
            </Text>
          </View>

          <Text style={[styles.meta, { color: theme.muted }]}>
            Amenities: {amenitiesText}
          </Text>
          {typeof gym.distanceKm === "number" ? (
            <Text style={[styles.distance, { color: theme.primary }]}>
              {gym.distanceKm < 1
                ? `${Math.round(gym.distanceKm * 1000)} m away`
                : `${gym.distanceKm.toFixed(1)} km away`}
            </Text>
          ) : null}

          <View style={styles.capacityContainer}>
            <Text style={[styles.capacity, { color: theme.primary }]}>
              Capacity: {gym.capacity}
            </Text>

            {isClosed && (
              <Text style={styles.closed}>
                ◷ Opens at {formatTo12Hour(gym.openingTime)}
              </Text>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function formatTo12Hour(timeStr: string): string {
  if (!timeStr) return "";

  const [h, m] = timeStr.split(":");
  const hours = parseInt(h, 10);

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12; // Converts 0 -> 12 and 12 -> 12

  return `${displayHours}:${m} ${period}`;
}

function isGymClosed(gym: Gym): boolean {
  const now = new Date();
  const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const { openingTime: open, closingTime: close } = gym;

  if (close > open) {
    return current < open || current >= close;
  }

  return current < open && current >= close;
}
const styles = StyleSheet.create({
  gymCard: { overflow: "hidden", borderRadius: 12, borderWidth: 1, padding: 0 },
  photoWrap: { height: 182, position: "relative" },
  openBadge: {
    position: "absolute",
    top: 16,
    left: 14,
    backgroundColor: "#40f0ad",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  closedBadge: {
    backgroundColor: "#ea7a1f",
  },
  closedText: {
    color: "#fff",
  },
  openText: {
    color: "#07110d",
    fontFamily: "monospace",
    fontSize: 13,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  cardInfo: { padding: 18, paddingTop: 0 },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
  },
  gymName: { fontSize: 18 },
  meta: { fontSize: 15, marginTop: 12 },
  distance: { fontSize: 14, marginTop: 8, fontWeight: "700" },
  capacity: {
    fontSize: 15,
    marginTop: 12,
    fontWeight: "600",
  },
  closed: {
    color: "#d78383",
    marginTop: 18,
    fontSize: 15,
  },
  capacityContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
