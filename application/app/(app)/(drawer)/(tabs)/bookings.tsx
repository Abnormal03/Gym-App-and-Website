// app/(drawer)/(tabs)/bookings.tsx
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  Modal,
  Dimensions,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useMyBookings } from "../../../../src/hooks/useMyBookings";
import { MyBooking } from "../../../../src/types/booking.types";
import { useKeepAwake } from "expo-keep-awake";
import { useTheme } from "../../../../src/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { SkeletonCards } from "../../../../src/components/gym/SkeletonLoading";
import { MemberPassQr } from "../../../../src/components/common/MemberPassQr";

const { width } = Dimensions.get("window");

export default function BookingsScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const { upcoming, past, loading, refreshing, error, onRefresh } =
    useMyBookings();

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [qrBooking, setQrBooking] = useState<MyBooking | null>(null);

  const colors = {
    bg: theme.background,
    card: theme.card,
    border: theme.border,
    text: theme.foreground,
    muted: theme.muted,
    tabActive: theme.primary,
    tabInactive: theme.subtle,
    tabBorder: theme.primary,
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <SkeletonCards theme={theme} rows={3} variant="booking" />
      </View>
    );
  }

  if (error && upcoming.length + past.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        <TouchableOpacity
          onPress={onRefresh}
          style={[styles.retryBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.retryText, { color: theme.card }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const data = activeTab === "upcoming" ? upcoming : past;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Tab Switcher */}
      <View style={[styles.tabSwitcher, { borderBottomColor: colors.border }]}>
        {(["upcoming", "past"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabSwitcherItem,
              activeTab === tab && {
                borderBottomWidth: 2,
                borderBottomColor: colors.tabBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.tabSwitcherText,
                {
                  color:
                    activeTab === tab ? colors.tabActive : colors.tabInactive,
                },
              ]}
            >
              {tab === "upcoming"
                ? `Upcoming (${upcoming.length})`
                : `Past (${past.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <Text style={[styles.offlineNote, { color: theme.muted }]}>
          Could not refresh — showing saved booking information. Status and QR
          validity may have changed since the last update.
        </Text>
      ) : null}

      {/* Booking List */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            tab={activeTab}
            onBrowse={() => router.push("/(drawer)/(tabs)/")}
            theme={theme}
          />
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onShowQR={() => setQrBooking(item)}
            colors={colors}
            theme={theme}
          />
        )}
      />

      {/* QR Modal */}
      {qrBooking && (
        <QRModal
          booking={qrBooking}
          onClose={() => setQrBooking(null)}
          onDetails={() => {
            const bookingId = qrBooking.id;
            setQrBooking(null);
            router.push(`/booking/details/${bookingId}`);
          }}
          isDark={isDark}
          theme={theme}
        />
      )}
    </View>
  );
}

// ─── Booking Card ──────────────────────────────────────────────────────────────
const BookingCard = ({
  booking,
  onShowQR,
  colors,
  theme,
}: {
  booking: MyBooking;
  onShowQR: () => void;
  colors: Record<string, string>;
  theme: any;
}) => {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      timeZone: "Africa/Addis_Ababa",
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      timeZone: "Africa/Addis_Ababa",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const statusConfig: Record<
    string,
    { label: string; bg: string; text: string }
  > = {
    confirmed: { label: "Confirmed", bg: "#e8f5e9", text: "#2e7d32" },
    pending: { label: "Pending", bg: "#fff8e1", text: "#f57f17" },
    checked_in: { label: "Checked In", bg: "#e3f2fd", text: "#1565c0" },
    cancelled: { label: "Cancelled", bg: "#ffebee", text: "#c62828" },
  };

  const visitWindowEnded =
    booking.status === "confirmed" && new Date(booking.slotEnd).getTime() < Date.now();
  const config = visitWindowEnded
    ? { label: "Visit time ended", bg: theme.input, text: theme.muted }
    : statusConfig[booking.status] ?? statusConfig.cancelled;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Gym Photo + Info */}
      <View style={styles.cardTop}>
        {booking.gym.photos?.[0] ? (
          <Image
            source={{ uri: booking.gym.photos[0] }}
            style={styles.gymPhoto}
          />
        ) : (
          <View
            style={[
              styles.gymPhoto,
              styles.gymPhotoPlaceholder,
              { backgroundColor: theme.input },
            ]}
          >
            <Text style={{ fontSize: 20 }}>
              <MaterialIcons
                name="fitness-center"
                size={45}
                color={theme.primary}
              />
            </Text>
          </View>
        )}

        <View style={styles.cardInfo}>
          <Text
            style={[styles.gymName, { color: colors.text }]}
            numberOfLines={1}
          >
            {booking.gym.name}
          </Text>
          <Text
            style={[styles.packageName, { color: colors.muted }]}
            numberOfLines={1}
          >
            {booking.package?.name}
          </Text>
          <Text style={[styles.slotTime, { color: colors.muted }]}>
            {formatDate(booking.slotStart)}
          </Text>
          <Text style={[styles.slotTime, { color: colors.muted }]}>
            {formatTime(booking.slotStart)} → {formatTime(booking.slotEnd)}
          </Text>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
          <Text style={[styles.statusText, { color: config.text }]}>
            {config.label}
          </Text>
        </View>
      </View>

      {/* Show QR — only for confirmed bookings */}
      {booking.status === "confirmed" && !visitWindowEnded && (
        <TouchableOpacity
          onPress={onShowQR}
          style={[
            styles.qrBtn,
            { backgroundColor: theme.primary, borderTopColor: theme.border },
          ]}
        >
          <Text style={[styles.qrBtnText, { color: theme.foreground }]}>
            Show QR Code for Check-In
          </Text>
        </TouchableOpacity>
      )}
      {visitWindowEnded ? (
        <Text style={[styles.slotTime, { color: colors.muted, paddingTop: 10 }]}>Check-in is no longer available for this time slot.</Text>
      ) : null}
    </View>
  );
};

// ─── QR Modal ─────────────────────────────────────────────────────────────────
const QRModal = ({
  booking,
  onClose,
  onDetails,
  isDark,
  theme,
}: {
  booking: MyBooking | null;
  onClose: () => void;
  onDetails: () => void;
  isDark: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
}) => {
  useKeepAwake(); // prevent screen dimming while showing QR

  if (!booking) return null;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      timeZone: "Africa/Addis_Ababa",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View
        style={[styles.qrModal, { backgroundColor: isDark ? "#000" : "#fff" }]}
      >
        {/* Close Button */}
        <TouchableOpacity onPress={onClose} style={styles.qrModalClose}>
          <Text style={{ fontSize: 24, color: isDark ? "#fff" : "#111" }}>
            ✕
          </Text>
        </TouchableOpacity>

        <Text
          style={[styles.qrModalTitle, { color: isDark ? "#fff" : "#111" }]}
        >
          {booking.gym.name}
        </Text>
        <Text style={[styles.qrModalSub, { color: isDark ? "#888" : "#666" }]}>
          {booking.package?.name ?? booking.packageName ?? "Gym booking"} ·{" "}
          {formatTime(booking.slotStart)} → {formatTime(booking.slotEnd)}
        </Text>

        <MemberPassQr gymId={booking.gymId} slotStart={booking.slotStart} slotEnd={booking.slotEnd} theme={theme} />

        <Text style={[styles.qrHint, { color: isDark ? "#666" : "#aaa" }]}>
          Keep this screen bright when scanning at reception
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onDetails}
          style={[styles.detailsBtn, { borderColor: isDark ? "#fff" : "#111" }]}
        >
          <Text
            style={[styles.detailsBtnText, { color: isDark ? "#fff" : "#111" }]}
          >
            Booking details
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({
  tab,
  onBrowse,
  theme,
}: {
  tab: "upcoming" | "past";
  onBrowse: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
}) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>{tab === "upcoming" ? "📅" : "📋"}</Text>
    <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
      {tab === "upcoming" ? "No upcoming bookings" : "No past bookings"}
    </Text>
    <Text style={[styles.emptyMessage, { color: theme.muted }]}>
      {tab === "upcoming"
        ? "Find a gym and book your next workout"
        : "Your completed bookings will appear here"}
    </Text>
    {tab === "upcoming" && (
      <TouchableOpacity
        onPress={onBrowse}
        style={[styles.browseBtn, { backgroundColor: theme.primary }]}
      >
        <Text style={[styles.browseBtnText, { color: theme.card }]}>
          Browse Gyms
        </Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: { fontSize: 15, marginBottom: 16, textAlign: "center" },
  retryBtn: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: "#fff", fontWeight: "600" },

  // Tab switcher
  tabSwitcher: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabSwitcherItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: -1,
  },
  tabSwitcherText: { fontSize: 15, fontWeight: "600" },

  listContent: { padding: 16, gap: 12, paddingBottom: 32 },

  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  gymPhoto: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  gymPhotoPlaceholder: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: { flex: 1 },
  gymName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  packageName: { fontSize: 13, marginBottom: 4 },
  slotTime: { fontSize: 12 },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  statusText: { fontSize: 11, fontWeight: "600" },

  qrBtn: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    padding: 14,
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  qrBtnText: { fontSize: 14, fontWeight: "600", color: "#111" },

  // QR Modal
  qrModal: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  qrModalClose: {
    position: "absolute",
    top: 52,
    right: 24,
    padding: 8,
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  qrModalSub: { fontSize: 14, marginBottom: 40, textAlign: "center" },
  qrCodeWrapper: {
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  qrHint: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  detailsBtn: {
    marginTop: 22,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  detailsBtnText: { fontSize: 14, fontWeight: "600" },
  offlineNote: {
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // Empty
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptyMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  browseBtn: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  browseBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
