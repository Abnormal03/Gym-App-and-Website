import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { bookingService } from "../../../src/services/booking.service";
import type { MemberPaymentHistoryEntry } from "../../../src/types/booking.types";
import { useTheme } from "../../../src/hooks/useTheme";
import type { ThemePalette } from "../../../src/constants/colors";

type PaymentFilter =
  | "all"
  | "paid"
  | "pending"
  | "failed"
  | "cancelled"
  | "refunded"
  | "expired";
const PAYMENT_FILTERS: Array<{ key: PaymentFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "refunded", label: "Refunded" },
  { key: "expired", label: "Expired" },
];
const FILTER_HELP: Record<PaymentFilter, string> = {
  all: "Every payment record, regardless of its current status.",
  paid: "Payments confirmed as successful.",
  pending: "Payments started but not yet confirmed as successful or failed.",
  failed: "Payments the provider reported as unsuccessful.",
  cancelled:
    "Bookings cancelled by you or the gym. This is the booking status; a refund may still be pending.",
  refunded:
    "Payments recorded as refunded. Refund timing may depend on the payment provider.",
  expired:
    "Bookings whose payment window expired before payment was completed.",
};

const ADDIS_TIME_ZONE = "Africa/Addis_Ababa";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-ET", {
    timeZone: ADDIS_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  });

const formatMoney = (amount: number | string, currency: string) =>
  `${currency} ${Number(amount).toLocaleString("en-ET", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusLabel = (status: MemberPaymentHistoryEntry["status"]) => {
  switch (status) {
    case "success":
      return "Paid";
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    case "expired":
      return "Expired";
  }
};

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [payments, setPayments] = useState<MemberPaymentHistoryEntry[]>([]);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await bookingService.getPaymentHistory();
      setPayments(response.payments ?? []);
    } catch (err) {
      setError(
        typeof err === "string" ? err : "Could not load payment history.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPayments();
    }, [loadPayments]),
  );

  const filteredPayments = payments.filter((payment) => {
    switch (filter) {
      case "all":
        return true;
      case "paid":
        return payment.status === "success";
      case "pending":
        return payment.status === "pending";
      case "failed":
        return payment.status === "failed";
      case "refunded":
        return payment.status === "refunded";
      case "cancelled":
        return payment.booking.status === "cancelled";
      case "expired":
        return payment.booking.status === "expired" || payment.status === "expired";
    }
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(drawer)/(tabs)")
          }
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={23} color={theme.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>Payment History</Text>
          <Text style={styles.subtitle}>
            Your bookings and payment timeline
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPayments(true)}
            tintColor={theme.primary}
          />
        }
      >
        {!loading && !error && payments.length > 0 ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filters}
              contentContainerStyle={styles.filterContent}
            >
              {PAYMENT_FILTERS.map((option) => {
                const selected = filter === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setFilter(option.key)}
                    style={[
                      styles.filterChip,
                      selected && styles.filterChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selected && styles.filterTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={styles.filterHelp}>{FILTER_HELP[filter]}</Text>
          </>
        ) : null}
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.stateText}>Loading payments…</Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <MaterialIcons name="error-outline" size={38} color={theme.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={() => loadPayments()}
              style={styles.retry}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : payments.length === 0 ? (
          <View style={styles.centerState}>
            <MaterialIcons name="receipt-long" size={42} color={theme.subtle} />
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.stateText}>
              Completed and pending booking payments will appear here.
            </Text>
          </View>
        ) : filteredPayments.length === 0 ? (
          <View style={styles.centerState}>
            <MaterialIcons name="filter-list" size={42} color={theme.subtle} />
            <Text style={styles.emptyTitle}>
              No{" "}
              {PAYMENT_FILTERS.find(
                (item) => item.key === filter,
              )?.label.toLowerCase()}{" "}
              payments
            </Text>
            <Text style={styles.stateText}>
              Try another filter to see more payment history.
            </Text>
          </View>
        ) : (
          filteredPayments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} theme={theme} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function PaymentCard({
  payment,
  theme,
}: {
  payment: MemberPaymentHistoryEntry;
  theme: ThemePalette;
}) {
  const styles = createStyles(theme);
  const timeline: Array<{
    label: string;
    date: string;
    icon:
      | "event-note"
      | "payments"
      | "fitness-center"
      | "check-circle"
      | "currency-exchange"
      | "error-outline";
  }> = [
    {
      label: "Booking created",
      date: payment.booking.createdAt,
      icon: "event-note" as const,
    },
    {
      label: "Payment initialized",
      date: payment.createdAt,
      icon: "payments" as const,
    },
    {
      label: "Gym visit",
      date: payment.booking.slotStart,
      icon: "fitness-center" as const,
    },
  ];
  if (payment.status !== "pending" && payment.updatedAt) {
    timeline.push({
      label: `Payment ${statusLabel(payment.status).toLowerCase()}`,
      date: payment.updatedAt,
      icon:
        payment.status === "success"
          ? "check-circle"
          : payment.status === "refunded"
            ? "currency-exchange"
            : "error-outline",
    });
  }
  timeline.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.gymIcon}>
          <MaterialIcons
            name="fitness-center"
            size={21}
            color={theme.primary}
          />
        </View>
        <View style={styles.gymInfo}>
          <Text style={styles.gymName} numberOfLines={1}>
            {payment.booking.gym.name}
          </Text>
          <Text style={styles.bookingMeta}>Booking #{payment.bookingId}</Text>
        </View>
        <View style={[styles.statusBadge, statusStyle(payment.booking.status === "expired" || payment.status === "expired" ? "expired" : payment.status, theme)]}>
          <Text
            style={[styles.statusText, statusTextStyle(payment.booking.status === "expired" || payment.status === "expired" ? "expired" : payment.status, theme)]}
          >
            {payment.booking.status === "expired" || payment.status === "expired" ? "Expired" : statusLabel(payment.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.amount}>
        {formatMoney(payment.amount, payment.currency)}
      </Text>
      <Text style={styles.packageName}>
        {payment.booking.package?.name ?? "Gym booking"}
      </Text>

      {payment.booking.order?.items?.length ? (
        <View style={styles.items}>
          {payment.booking.order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemLabel} numberOfLines={2}>
                {item.label}
              </Text>
              <Text style={styles.itemAmount}>
                {formatMoney(item.amount, payment.currency)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.timelineHeader}>
        <Text style={styles.timelineTitle}>Timeline</Text>
        <Text style={styles.timelineStatus}>
          Current status: {payment.booking.status === "expired" || payment.status === "expired" ? "Expired" : statusLabel(payment.status)}
        </Text>
      </View>
      <View style={styles.timeline}>
        {timeline.map((event, index) => (
          <View key={`${payment.id}-${event.label}`} style={styles.eventRow}>
            <View style={styles.eventRail}>
              <View style={styles.eventDot}>
                <MaterialIcons
                  name={event.icon}
                  size={13}
                  color={theme.primary}
                />
              </View>
              {index < timeline.length - 1 ? (
                <View style={styles.eventLine} />
              ) : null}
            </View>
            <View style={styles.eventTextBlock}>
              <Text style={styles.eventLabel}>{event.label}</Text>
              <Text style={styles.eventDate}>{formatDateTime(event.date)}</Text>
            </View>
          </View>
        ))}
      </View>

      {payment.booking.order?.needsManualRefund ? (
        <View style={styles.refundNotice}>
          <MaterialIcons name="info-outline" size={17} color={theme.error} />
          <Text style={styles.refundText}>
            {payment.booking.order.refundNote ||
              "This payment requires refund review."}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const statusStyle = (
  status: MemberPaymentHistoryEntry["status"],
  theme: ThemePalette,
) => ({
  backgroundColor:
    status === "success" || status === "refunded"
      ? theme.success + "1A"
      : status === "pending" || status === "expired"
        ? theme.primary + "1A"
        : theme.error + "1A",
});

const statusTextStyle = (
  status: MemberPaymentHistoryEntry["status"],
  theme: ThemePalette,
) => ({
  color:
    status === "success" || status === "refunded"
      ? theme.success
      : status === "pending" || status === "expired"
        ? theme.primary
        : theme.error,
});

const createStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      paddingTop: Platform.OS !== "web" ? 20 : 0,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingTop: 30,
      paddingBottom: 12,
      gap: 12,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    headerTitles: { flex: 1 },
    title: { color: theme.foreground, fontSize: 22, fontWeight: "700" },
    subtitle: { color: theme.muted, fontSize: 13, marginTop: 3 },
    content: { padding: 16, paddingBottom: 36, flexGrow: 1 },
    filters: { flexGrow: 0, marginBottom: 16, marginHorizontal: -16 },
    filterContent: { paddingHorizontal: 16, gap: 8 },
    filterChip: {
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterChipSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterText: { color: theme.muted, fontSize: 13, fontWeight: "600" },
    filterTextSelected: { color: theme.foreground },
    filterHelp: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: -7,
      marginBottom: 15,
    },
    centerState: {
      flex: 1,
      minHeight: 280,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 12,
    },
    stateText: {
      color: theme.muted,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },
    errorText: { color: theme.error, fontSize: 14, textAlign: "center" },
    emptyTitle: { color: theme.foreground, fontSize: 18, fontWeight: "700" },
    retry: {
      marginTop: 6,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.primary,
    },
    retryText: { color: theme.foreground, fontWeight: "700" },
    card: {
      borderRadius: 18,
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      padding: 16,
      marginBottom: 15,
    },
    cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    gymIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary + "1A",
    },
    gymInfo: { flex: 1 },
    gymName: { color: theme.foreground, fontSize: 15, fontWeight: "700" },
    bookingMeta: { color: theme.muted, fontSize: 12, marginTop: 3 },
    statusBadge: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    statusText: { fontSize: 12, fontWeight: "700" },
    amount: {
      color: theme.foreground,
      fontSize: 25,
      fontWeight: "800",
      marginTop: 17,
    },
    packageName: { color: theme.muted, fontSize: 14, marginTop: 3 },
    items: {
      marginTop: 13,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 8,
    },
    itemRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
    itemLabel: { color: theme.muted, flex: 1, fontSize: 13 },
    itemAmount: { color: theme.foreground, fontSize: 13, fontWeight: "600" },
    timelineHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 18,
      marginBottom: 12,
      gap: 8,
    },
    timelineTitle: { color: theme.foreground, fontSize: 15, fontWeight: "700" },
    timelineStatus: {
      color: theme.muted,
      fontSize: 11,
      flexShrink: 1,
      textAlign: "right",
    },
    timeline: { paddingLeft: 1 },
    eventRow: { flexDirection: "row", minHeight: 52, gap: 11 },
    eventRail: { width: 24, alignItems: "center" },
    eventDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.primary + "66",
      backgroundColor: theme.primary + "14",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    eventLine: {
      position: "absolute",
      top: 23,
      bottom: -1,
      width: 1,
      backgroundColor: theme.border,
    },
    eventTextBlock: { flex: 1, paddingBottom: 13 },
    eventLabel: { color: theme.foreground, fontSize: 13, fontWeight: "600" },
    eventDate: { color: theme.muted, fontSize: 12, marginTop: 3 },
    refundNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      padding: 10,
      borderRadius: 10,
      backgroundColor: theme.error + "12",
      marginTop: 7,
    },
    refundText: { color: theme.error, fontSize: 12, flex: 1, lineHeight: 17 },
  });
