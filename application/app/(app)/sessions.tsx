import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/common/Button";
import { ScreenHeader } from "../../src/components/common/ScreenHeader";
import { useSessions } from "../../src/hooks/useSessions";
import { useTheme } from "../../src/hooks/useTheme";
import { ProviderSession } from "../../src/types/session.types";
import { SkeletonCards } from "../../src/components/gym/SkeletonLoading";

export default function SessionsScreen() {
  const { theme, mode } = useTheme();
  const {
    sessions,
    loading,
    refreshing,
    error,
    actionError,
    reviewing,
    refresh,
    submitReview,
  } = useSessions();
  const [reviewSession, setReviewSession] = useState<ProviderSession | null>(
    null,
  );
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewedIds, setReviewedIds] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<"SCHEDULED" | "COMPLETED" | "CANCELLED">("SCHEDULED");
  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      ).filter((session) => session.status === statusFilter),
    [sessions, statusFilter],
  );

  const handleSubmitReview = async () => {
    if (!reviewSession) return;
    const sessionId = reviewSession.id;
    const success = await submitReview(sessionId, rating, comment);
    if (success) {
      setReviewedIds((ids) => [...ids, sessionId]);
      setReviewSession(null);
      setRating(5);
      setComment("");
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.screen}>
        <ScreenHeader title="My Sessions" />
        <View style={styles.filterRow}>
        {(["SCHEDULED", "COMPLETED", "CANCELLED"] as const).map((status) => {
            const selected = statusFilter === status;
            return (
              <TouchableOpacity
                key={status}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setStatusFilter(status)}
                style={[styles.filterChip, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : theme.card }]}
              >
                <Text style={{ color: selected ? theme.foreground : theme.muted, fontWeight: "700" }}>
                  {status === "SCHEDULED" ? "Scheduled" : status === "COMPLETED" ? "Completed" : "Canceled"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {loading ? (
          <SkeletonCards theme={theme} rows={3} variant="session" />
        ) : error && sessions.length === 0 ? (
          <View style={styles.centered}>
            <Text style={{ color: theme.error, textAlign: "center" }}>
              {error}
            </Text>
            <Button mode={mode} title="Retry" onPress={() => void refresh()} />
          </View>
        ) : (
          <FlatList
            data={sortedSessions}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refresh} />
            }
            ListEmptyComponent={
              <Text style={[styles.empty, { color: theme.muted }]}>
                {statusFilter === "SCHEDULED" ? "No scheduled sessions." : statusFilter === "COMPLETED" ? "No completed sessions yet." : "No canceled sessions."}
              </Text>
            }
            ListHeaderComponent={error ? <Text style={{ color: theme.muted, paddingBottom: 4 }}>Showing saved sessions. Reconnect to refresh.</Text> : null}
            renderItem={({ item }) => {
              const canReview =
                item.status === "COMPLETED" &&
                !item.review && !reviewedIds.includes(item.id);
              return (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.provider, { color: theme.foreground }]}>
                    {item.provider?.name ?? "Provider session"}
                  </Text>
                  <Text style={{ color: theme.muted }}>
                    {item.booking?.gym.name ?? "Gym"}
                    {item.booking?.package.name
                      ? ` · ${item.booking.package.name}`
                      : ""}
                  </Text>
                  <Text style={{ color: theme.muted }}>
                    {formatDate(item.startsAt)} · {formatTime(item.startsAt)}–
                    {formatTime(item.endsAt)}
                  </Text>
                  <Text style={{ color: theme.primary }}>{item.status}</Text>
                  {canReview ? (
                    <Button
                      mode={mode}
                      title="Leave a rating"
                      onPress={() => setReviewSession(item)}
                    />
                  ) : item.review ? (
                    <Text style={{ color: theme.success, fontWeight: "700" }}>Reviewed · {item.review.rating} / 5</Text>
                  ) : null}
                </View>
              );
            }}
          />
        )}
        {actionError && (
          <Text style={[styles.actionError, { color: theme.error }]}>
            {actionError}
          </Text>
        )}
      </View>

      <Modal
        visible={reviewSession !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewSession(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.modal,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
            <Text style={[styles.modalTitle, { color: theme.foreground }]}>
              Review {reviewSession?.provider?.name ?? "session"}
            </Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: rating === value }}
                  accessibilityLabel={`${value} star${value === 1 ? "" : "s"}`}
                  onPress={() => setRating(value)}
                >
                  <Text
                    style={{
                      color: value <= rating ? theme.primary : theme.subtle,
                      fontSize: 30,
                    }}
                  >
                    ★
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              accessibilityLabel="Review comment"
              value={comment}
              onChangeText={setComment}
              maxLength={500}
              multiline
              placeholder="Share a comment (optional)"
              placeholderTextColor={theme.muted}
              style={[
                styles.comment,
                {
                  color: theme.foreground,
                  backgroundColor: theme.input,
                  borderColor: theme.border,
                },
              ]}
            />
            <Button
              mode={mode}
              title="Submit review"
              onPress={handleSubmitReview}
              loading={reviewing}
              disabled={!reviewSession}
            />
            <TouchableOpacity
              onPress={() => setReviewSession(null)}
              disabled={reviewing}
              style={styles.cancel}
            >
              <Text style={{ color: theme.muted }}>Not now</Text>
            </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1, width: "100%", maxWidth: 640, alignSelf: "center" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  filterRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  filterChip: { borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 },
  empty: { textAlign: "center", marginTop: 80, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 8 },
  provider: { fontSize: 17, fontWeight: "700" },
  actionError: { margin: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  ratingRow: { flexDirection: "row", justifyContent: "center", gap: 8 },
  comment: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: "top",
  },
  cancel: { alignItems: "center", padding: 10 },
});
