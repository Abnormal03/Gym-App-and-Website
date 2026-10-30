import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { PressableProps } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { Gym } from "../../types/gym.types";
import type { ThemePalette } from "../../constants/colors";

interface Props {
  gym: Gym;
  theme: ThemePalette;
  onPress: PressableProps["onPress"];
}

export function isGymTwentyFourSeven(gym: Pick<Gym, "openingTime" | "closingTime">) {
  return gym.openingTime === "00:00" && gym.closingTime === "23:59";
}

export function isGymOpenNow(
  gym: Pick<Gym, "openingTime" | "closingTime">,
  now = new Date(),
) {
  if (isGymTwentyFourSeven(gym)) return true;

  const [openHour, openMinute] = (gym.openingTime ?? "").split(":").map(Number);
  const [closeHour, closeMinute] = (gym.closingTime ?? "").split(":").map(Number);
  if (![openHour, openMinute, closeHour, closeMinute].every(Number.isFinite)) {
    return false;
  }

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Addis_Ababa",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const currentHour = Number(time.find((part) => part.type === "hour")?.value);
  const currentMinute = Number(time.find((part) => part.type === "minute")?.value);
  const currentMinutes = currentHour * 60 + currentMinute;
  const openingMinutes = openHour * 60 + openMinute;
  const closingMinutes = closeHour * 60 + closeMinute;

  // The backend currently accepts same-day hours where opening is before closing.
  return openingMinutes < closingMinutes &&
    currentMinutes >= openingMinutes &&
    currentMinutes < closingMinutes;
}

function getMonthlyPrice(gym: Gym) {
  const monthlyPackage = gym.packages?.find(
    (gymPackage) => gymPackage.type === "monthly" || gymPackage.durationDays === 30,
  );
  if (!monthlyPackage || !Number.isFinite(Number(monthlyPackage.price))) return null;

  return `ETB ${Number(monthlyPackage.price).toLocaleString("en-US")} / month`;
}

export function GymCard({ gym, theme, onPress }: Props) {
  const isOpen = isGymOpenNow(gym);
  const monthlyPrice = getMonthlyPrice(gym);
  const amenities = gym.amenities?.filter(Boolean).slice(0, 3) ?? [];
  const photoUri = gym.photos?.find((photo) => typeof photo === "string" && photo.trim());

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${gym.name}, ${gym.address}`}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.photoWrap, { backgroundColor: theme.skeleton }]}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
          ) : (
            <MaterialIcons name="fitness-center" size={28} color={theme.muted} />
          )}
          <View style={[styles.openBadge, { backgroundColor: isOpen ? "#DDF5E8" : "#F1E5E5" }]}>
            <Text style={[styles.openText, { color: isOpen ? "#13734B" : "#9A4141" }]}>
              {isOpen ? "Open now" : "Closed"}
            </Text>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text numberOfLines={1} style={[styles.gymName, { color: theme.foreground }]}>
            {gym.name}
          </Text>
          <View style={styles.addressRow}>
            <MaterialIcons name="place" size={14} color={theme.muted} />
            <Text numberOfLines={1} style={[styles.address, { color: theme.muted }]}>
              {gym.address}
            </Text>
          </View>

          {amenities.length > 0 ? (
            <View style={styles.amenities}>
              {amenities.map((amenity) => (
                <View key={amenity} style={[styles.amenityChip, { backgroundColor: `${theme.primary}16` }]}>
                  <Text numberOfLines={1} style={[styles.amenityText, { color: theme.primary }]}>
                    {amenity}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
            <Text style={[styles.capacity, { color: theme.muted }]}>
              Capacity {gym.capacity}
            </Text>
            {monthlyPrice ? (
              <Text numberOfLines={1} style={[styles.price, { color: theme.primary }]}>
                {monthlyPrice}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { borderRadius: 18 },
  pressed: { opacity: 0.92 },
  card: {
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
  },
  photoWrap: {
    height: 164,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  photo: { width: "100%", height: "100%" },
  openBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 18,
  },
  openText: { fontSize: 13, fontWeight: "600" },
  cardInfo: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  gymName: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  address: { flex: 1, fontSize: 14, lineHeight: 19 },
  amenities: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  amenityChip: { maxWidth: "48%", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  amenityText: { fontSize: 13, fontWeight: "500" },
  cardFooter: {
    minHeight: 44,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  capacity: { fontSize: 14 },
  price: { flexShrink: 1, fontSize: 14, fontWeight: "700", textAlign: "right" },
});
