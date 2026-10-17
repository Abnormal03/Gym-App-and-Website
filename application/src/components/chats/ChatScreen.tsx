import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../hooks/useTheme";
import { useConversations } from "../../hooks/useConversations";
import { useConversationMessages } from "../../hooks/useConversationMessages";
import { ChatMessage } from "../../types/chat.types";
import { providerService } from "../../services/provider.service";
import { sessionService } from "../../services/session.service";
import type { ProviderSession } from "../../types/session.types";

if (Platform.OS === "android")
  UIManager.setLayoutAnimationEnabledExperimental?.(true);

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const conversationId = Array.isArray(id) ? id[0] : (id ?? null);
  const router = useRouter();
  const { theme } = useTheme();
  const {
    conversations,
    loading: inboxLoading,
    error: inboxError,
    refresh: refreshInbox,
  } = useConversations();
  const conversation = useMemo(
    () =>
      conversations.find(
        (item) => String(item.id) === String(conversationId ?? ""),
      ) ?? null,
    [conversationId, conversations],
  );
  const {
    messages,
    loading,
    refreshing,
    loadingOlder,
    sending,
    error,
    sendError,
    hasOlderMessages,
    refresh,
    loadOlder,
    send,
    edit,
    remove,
  } = useConversationMessages(conversation ? String(conversation.id) : null);
  const [draft, setDraft] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null,
  );
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [completedUnratedSessions, setCompletedUnratedSessions] = useState<
    ProviderSession[]
  >([]);
  const [reviewSession, setReviewSession] = useState<ProviderSession | null>(
    null,
  );
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const focusedOnce = useRef(false);
  const animateChatLayout = () =>
    LayoutAnimation.configureNext({
      duration: 180,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });

  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current && conversation) void refresh();
      focusedOnce.current = true;
      if (conversation) {
        void sessionService
          .getMine()
          .then((sessions) => {
            setCompletedUnratedSessions(
              sessions.filter(
                (session) =>
                  String(session.providerId) ===
                    String(conversation.contact.id) &&
                  session.status === "COMPLETED" &&
                  !session.review,
              ),
            );
          })
          .catch(() => setCompletedUnratedSessions([]));
      }
      return undefined;
    }, [conversation, refresh]),
  );

  useEffect(() => {
    if (messages.length > 0)
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const onSend = async () => {
    const message = draft.trim();
    if (!message || !conversation?.eligible || sending || error) return;
    const sent = editingMessageId
      ? await edit(editingMessageId, message)
      : await send(message);
    if (sent) {
      setDraft("");
      setEditingMessageId(null);
      setSelectedMessageId(null);
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true }),
      );
    }
  };

  const onReviewSession = async () => {
    if (!reviewSession || submittingReview) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      await sessionService.review(reviewSession.id, {
        rating: reviewRating,
        ...(reviewComment.trim() ? { comment: reviewComment.trim() } : {}),
      });
      setCompletedUnratedSessions((items) =>
        items.filter((item) => item.id !== reviewSession.id),
      );
      setReviewSession(null);
      setReviewComment("");
      setReviewRating(5);
    } catch (failure) {
      setReviewError(
        typeof failure === "string"
          ? failure
          : failure instanceof Error
            ? failure.message
            : "Unable to submit your rating.",
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const goBack = () => {
    // Browser history may point outside the app tab stack (often to Home), so
    // take the user directly back to the chats tab on every platform.
    router.replace("/(drawer)/(tabs)/chats");
  };

  const openProviderProfile = async () => {
    if (!conversation) return;
    let type = conversation?.contact?.type.toLocaleUpperCase();
    if (
      type !== "TRAINER" &&
      type !== "PHYSIOTHERAPIST" &&
      type !== "NUTRITION_CONSULTANT"
    ) {
      try {
        const provider = await providerService.getById(
          Number(conversation?.contact?.id),
        );
        type = provider.type?.toLocaleUpperCase() ?? type;
      } catch {
        return;
      }
    }
    if (type === "TRAINER") {
      router.push(
        `/trainer/${encodeURIComponent(String(conversation.contact.id))}`,
      );
    } else if (type === "PHYSIOTHERAPIST") {
      router.push(
        `/physiotherapist/${encodeURIComponent(String(conversation.contact.id))}`,
      );
    } else if (type === "NUTRITION_CONSULTANT" || type === "NUTRITIONIST") {
      router.push(
        `/nutrition-consultant/${encodeURIComponent(String(conversation.contact.id))}`,
      );
    }
  };

  // Member and provider IDs come from different tables and can have the same
  // numeric value. Sender role is the authoritative direction for alignment.
  const isMemberMessage = (message: ChatMessage) =>
    message.senderType.toUpperCase() === "MEMBER";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to chats"
            onPress={goBack}
            style={styles.backButton}
          >
            <MaterialIcons
              name="arrow-back-ios"
              size={22}
              color={theme.foreground}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${conversation?.contact.name ?? "provider"} profile`}
            disabled={!conversation}
            onPress={() => void openProviderProfile()}
            style={[
              styles.avatar,
              { backgroundColor: theme.input, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {conversation?.contact.name
                .trim()
                .slice(0, 1)
                .toLocaleUpperCase() || "?"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${conversation?.contact.name ?? "provider"} profile`}
            disabled={!conversation}
            onPress={() => void openProviderProfile()}
            style={styles.headerCopy}
          >
            <Text
              numberOfLines={1}
              style={[styles.title, { color: theme.foreground }]}
            >
              {conversation?.contact.name ?? "Conversation"}
            </Text>
            <Text style={[styles.subtitle, { color: theme.primary }]}>
              {conversation
                ? formatContactType(conversation.contact.type)
                : "Provider chat"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh messages"
            onPress={() => void refresh()}
            disabled={!conversation || refreshing}
            style={styles.refreshButton}
          >
            {refreshing ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <MaterialIcons name="refresh" size={23} color={theme.primary} />
            )}
          </Pressable>
        </View>

        {!conversationId ? (
          <View style={styles.state}>
            <Text style={[styles.stateTitle, { color: theme.foreground }]}>
              Conversation not specified
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={goBack}
              style={[styles.backToInbox, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.sendText}>Back to chats</Text>
            </Pressable>
          </View>
        ) : !conversation && inboxLoading ? (
          <View style={styles.state}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.stateText, { color: theme.muted }]}>
              Loading conversation…
            </Text>
          </View>
        ) : !conversation && inboxError ? (
          <View style={styles.state}>
            <Text style={[styles.stateText, { color: theme.error }]}>
              {inboxError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refreshInbox()}
              style={[styles.backToInbox, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.sendText}>Retry</Text>
            </Pressable>
          </View>
        ) : !conversation ? (
          <View style={styles.state}>
            <MaterialIcons
              name="chat-bubble-outline"
              size={38}
              color={theme.muted}
            />
            <Text style={[styles.stateTitle, { color: theme.foreground }]}>
              Conversation unavailable
            </Text>
            <Text style={[styles.stateText, { color: theme.muted }]}>
              This conversation is not in your inbox. It may have been removed
              or you may not have access.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={goBack}
              style={[styles.backToInbox, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.sendText}>Back to chats</Text>
            </Pressable>
          </View>
        ) : loading && messages.length === 0 ? (
          <View style={styles.state}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.stateText, { color: theme.muted }]}>
              Loading messages…
            </Text>
          </View>
        ) : error && messages.length === 0 ? (
          <View style={styles.state}>
            <Text style={[styles.stateText, { color: theme.error }]}>
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refresh()}
              style={[styles.backToInbox, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.sendText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {!conversation.eligible ? (
              <View
                style={[
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    flexDirection: "row",
                    gap: 5,
                    height: 30,
                    borderWidth: 1,
                    margin: 10,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={18}
                  color={theme.error}
                />
                <Text style={[{ color: theme.muted }]}>
                  You can read only your chat history.
                </Text>
              </View>
            ) : null}
            {completedUnratedSessions.map((session) => (
              <Pressable
                key={session.id}
                accessibilityRole="button"
                onPress={() => {
                  animateChatLayout();
                  setReviewSession(session);
                }}
                style={[
                  styles.reviewPrompt,
                  { backgroundColor: theme.card, borderColor: theme.primary },
                ]}
              >
                <MaterialIcons
                  name="star-outline"
                  size={20}
                  color={theme.primary}
                />
                <Text
                  style={[styles.reviewPromptText, { color: theme.foreground }]}
                >
                  Session completed · Leave a rating
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={theme.primary}
                />
              </Pressable>
            ))}
            {error && (
              <Text style={[styles.inlineError, { color: theme.error }]}>
                {error} · Saved messages are read-only until the connection is
                restored.
              </Text>
            )}
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(message) => String(message.id)}
              contentContainerStyle={[
                styles.messages,
                messages.length === 0 && styles.emptyMessages,
              ]}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => void refresh()}
                  tintColor={theme.primary}
                />
              }
              ListHeaderComponent={
                hasOlderMessages ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={loadingOlder}
                    onPress={() => void loadOlder()}
                    style={styles.loadOlder}
                  >
                    {loadingOlder ? (
                      <ActivityIndicator color={theme.primary} />
                    ) : (
                      <Text style={{ color: theme.primary, fontWeight: "700" }}>
                        Load older messages
                      </Text>
                    )}
                  </Pressable>
                ) : null
              }
              ListEmptyComponent={
                <Text style={[styles.stateText, { color: theme.muted }]}>
                  {conversation.eligible
                    ? "No messages yet. Start the conversation below."
                    : "No messages in this conversation yet."}
                </Text>
              }
              renderItem={({ item }) => {
                const fromMember = isMemberMessage(item);
                return (
                  <Animated.View
                    style={[
                      styles.messageGroup,
                      fromMember ? styles.outgoingGroup : styles.incomingGroup,
                    ]}
                  >
                    {selectedMessageId === String(item.id) &&
                    fromMember &&
                    !item.isDeleted ? (
                      <View
                        style={[
                          styles.messageActions,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        {deleteCandidateId === String(item.id) ? (
                          <>
                            <Text style={{ color: theme.foreground }}>
                              Delete this message?
                            </Text>
                            <Pressable
                              disabled={sending}
                              onPress={async () => {
                                const deleted = await remove(item.id);
                                if (deleted) setSelectedMessageId(null);
                                setDeleteCandidateId(null);
                              }}
                            >
                              <Text
                                style={{
                                  color: theme.error,
                                  fontWeight: "700",
                                }}
                              >
                                Delete
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => setDeleteCandidateId(null)}
                            >
                              <Text style={{ color: theme.muted }}>Keep</Text>
                            </Pressable>
                          </>
                        ) : (
                          <>
                            <Pressable
                              onPress={() => {
                                animateChatLayout();
                                setEditingMessageId(String(item.id));
                                setDraft(item.content);
                                setSelectedMessageId(null);
                              }}
                            >
                              <Text
                                style={{
                                  color: theme.primary,
                                  fontWeight: "700",
                                }}
                              >
                                Edit
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                animateChatLayout();
                                setDeleteCandidateId(String(item.id));
                              }}
                            >
                              <Text
                                style={{
                                  color: theme.error,
                                  fontWeight: "700",
                                }}
                              >
                                Delete
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                animateChatLayout();
                                setSelectedMessageId(null);
                              }}
                            >
                              <Text style={{ color: theme.muted }}>Cancel</Text>
                            </Pressable>
                          </>
                        )}
                      </View>
                    ) : null}
                    <Pressable
                      onLongPress={() => {
                        if (
                          fromMember &&
                          !item.isDeleted &&
                          conversation.eligible
                        ) {
                          animateChatLayout();
                          setSelectedMessageId(String(item.id));
                          setDeleteCandidateId(null);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        item.isDeleted
                          ? "Deleted chat message"
                          : `${fromMember ? "Your" : "Provider"} message. Hold to view actions`
                      }
                      delayLongPress={350}
                      style={[
                        styles.bubble,
                        fromMember
                          ? [
                              styles.outgoingBubble,
                              { backgroundColor: theme.primary },
                            ]
                          : [
                              styles.incomingBubble,
                              {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                              },
                            ],
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          {
                            color: item.isDeleted
                              ? theme.muted
                              : fromMember
                                ? "#FFFFFF"
                                : theme.foreground,
                            fontStyle: item.isDeleted ? "italic" : "normal",
                          },
                        ]}
                      >
                        {item.isDeleted
                          ? "This message was deleted"
                          : item.content}
                        {item.editedAt && !item.isDeleted ? " · edited" : ""}
                      </Text>
                    </Pressable>

                    <View
                      style={[
                        styles.messageMeta,
                        fromMember && styles.outgoingMessageMeta,
                      ]}
                    >
                      <Text style={[styles.time, { color: theme.muted }]}>
                        {formatMessageTime(item.createdAt)}
                      </Text>
                      {fromMember && (
                        <MaterialIcons
                          name={item.readAt ? "done-all" : "done"}
                          size={15}
                          color={item.readAt ? "#42B8FF" : theme.muted}
                          accessibilityLabel={item.readAt ? "Read" : "Sent"}
                        />
                      )}
                    </View>
                  </Animated.View>
                );
              }}
            />
            {sendError && (
              <Text style={[styles.inlineError, { color: theme.error }]}>
                {sendError}
              </Text>
            )}
            {conversation.eligible ? (
              <View
                style={[
                  styles.composer,
                  {
                    borderTopColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
              >
                {editingMessageId ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel message edit"
                    onPress={() => {
                      setEditingMessageId(null);
                      setDraft("");
                    }}
                    style={styles.cancelEdit}
                  >
                    <MaterialIcons name="close" size={19} color={theme.muted} />
                  </Pressable>
                ) : null}
                <TextInput
                  accessibilityLabel={
                    editingMessageId
                      ? "Edit message"
                      : `Message ${conversation.contact.name}`
                  }
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={() => void onSend()}
                  placeholder={
                    editingMessageId
                      ? "Edit your message…"
                      : `Message ${conversation.contact.name}…`
                  }
                  placeholderTextColor={theme.muted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.input,
                      borderColor: theme.border,
                      color: theme.foreground,
                    },
                  ]}
                  multiline
                  maxLength={2000}
                  editable={!sending && !error && conversation.eligible}
                  returnKeyType="send"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    editingMessageId ? "Save message edit" : "Send message"
                  }
                  accessibilityState={{
                    disabled:
                      sending ||
                      Boolean(error) ||
                      !conversation.eligible ||
                      !draft.trim(),
                  }}
                  disabled={
                    sending ||
                    Boolean(error) ||
                    !conversation.eligible ||
                    !draft.trim()
                  }
                  onPress={() => void onSend()}
                  style={[
                    styles.sendButton,
                    { backgroundColor: theme.primary },
                    (sending ||
                      Boolean(error) ||
                      !conversation.eligible ||
                      !draft.trim()) &&
                      styles.disabled,
                  ]}
                >
                  {sending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <MaterialIcons
                      name={editingMessageId ? "check" : "send"}
                      size={20}
                      color="#FFFFFF"
                    />
                  )}
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </KeyboardAvoidingView>
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
          <View
            style={[
              styles.reviewModal,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.reviewTitle, { color: theme.foreground }]}>
              Rate your completed session
            </Text>
            <Text style={{ color: theme.muted, textAlign: "center" }}>
              {conversation?.contact.name}
            </Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`${value} stars`}
                  onPress={() => setReviewRating(value)}
                >
                  <MaterialIcons
                    name={value <= reviewRating ? "star" : "star-outline"}
                    size={34}
                    color={theme.primary}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              accessibilityLabel="Optional review comment"
              value={reviewComment}
              onChangeText={setReviewComment}
              maxLength={500}
              multiline
              placeholder="Share a comment (optional)"
              placeholderTextColor={theme.muted}
              style={[
                styles.reviewInput,
                {
                  color: theme.foreground,
                  backgroundColor: theme.input,
                  borderColor: theme.border,
                },
              ]}
            />
            {reviewError ? (
              <Text style={{ color: theme.error }}>{reviewError}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={submittingReview}
              onPress={() => void onReviewSession()}
              style={[
                styles.reviewSubmit,
                {
                  backgroundColor: theme.primary,
                  opacity: submittingReview ? 0.65 : 1,
                },
              ]}
            >
              {submittingReview ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.reviewSubmitText}>Submit rating</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setReviewSession(null)}
            >
              <Text
                style={{ color: theme.muted, textAlign: "center", padding: 8 }}
              >
                Not now
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function formatContactType(type: string) {
  return type
    .toLocaleLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1, width: "100%", maxWidth: 640, alignSelf: "center" },
  header: {
    minHeight: 76,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 19, fontWeight: "800" },
  headerCopy: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: "800" },
  subtitle: { fontSize: 12, fontWeight: "600" },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  messages: { flexGrow: 1, padding: 16, gap: 15 },
  emptyMessages: { justifyContent: "center" },
  loadOlder: { alignSelf: "center", padding: 10 },
  messageGroup: { maxWidth: "86%", gap: 5 },
  incomingGroup: { alignSelf: "flex-start" },
  outgoingGroup: { alignSelf: "flex-end" },
  bubble: {
    borderRadius: 17,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  incomingBubble: { borderTopLeftRadius: 5 },
  outgoingBubble: { borderTopRightRadius: 5 },
  messageText: { fontSize: 15, lineHeight: 21 },
  time: { fontSize: 10, paddingHorizontal: 4 },
  messageMeta: { flexDirection: "row", alignItems: "center", gap: 2 },
  outgoingMessageMeta: { justifyContent: "flex-end" },
  messageActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16,
    padding: 10,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 5,
  },
  reviewPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    marginHorizontal: 12,
    marginBottom: 6,
  },
  reviewPromptText: { flex: 1, fontSize: 13, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  reviewModal: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  reviewTitle: { textAlign: "center", fontSize: 19, fontWeight: "800" },
  ratingRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  reviewInput: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
  },
  reviewSubmit: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewSubmitText: { color: "#FFFFFF", fontWeight: "800" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  cancelEdit: {
    width: 36,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 15,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.55 },
  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 28,
  },
  stateTitle: { fontSize: 18, fontWeight: "800" },
  stateText: {
    maxWidth: 360,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
  },
  backToInbox: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
  sendText: { color: "#FFFFFF", fontWeight: "700" },
  inlineError: { paddingHorizontal: 14, paddingBottom: 8, fontSize: 12 },
});
