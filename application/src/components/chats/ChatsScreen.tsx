import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../hooks/useTheme";
import { useConversations } from "../../hooks/useConversations";
import { ChatConversation, EligibleChatContact } from "../../types/chat.types";

type InboxFilter = "all" | "unread";

export default function ChatsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    conversations,
    eligibleContacts,
    loading,
    refreshing,
    error,
    actionError,
    openingKey,
    refresh,
    openConversation,
  } = useConversations();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const visibleConversations = useMemo(
    () =>
      conversations
        .filter((conversation) => {
          const matchesFilter =
            filter === "all" || conversation.unreadCount > 0;
          const matchesSearch =
            !normalizedQuery ||
            `${conversation.contact.name} ${conversation.contact.type} ${
              conversation.lastMessage?.content ?? ""
            }`
              .toLocaleLowerCase()
              .includes(normalizedQuery);
          return matchesFilter && matchesSearch;
        })
        .sort(
          (left, right) =>
            getConversationActivityTime(right) -
            getConversationActivityTime(left),
        ),
    [conversations, filter, normalizedQuery],
  );

  const startableContacts = useMemo(() => {
    if (filter === "unread") return [];
    const existingProviders = new Set(
      conversations.map((conversation) => String(conversation.contact.id)),
    );
    const seenProviders = new Set<string>();

    return eligibleContacts.filter((contact) => {
      const providerId = String(contact.id);
      if (
        !contact.eligible ||
        existingProviders.has(providerId) ||
        seenProviders.has(providerId)
      )
        return false;
      seenProviders.add(providerId);
      return (
        !normalizedQuery ||
        `${contact.name} ${contact.type}`
          .toLocaleLowerCase()
          .includes(normalizedQuery)
      );
    });
  }, [conversations, eligibleContacts, filter, normalizedQuery]);

  const navigateToConversation = (conversation: ChatConversation) => {
    router.push(`/chats/${encodeURIComponent(String(conversation.id))}`);
  };

  const handleOpenContact = async (contact: EligibleChatContact) => {
    const conversation = await openConversation(contact);
    if (conversation) navigateToConversation(conversation);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.viewport}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.input, borderColor: theme.border },
          ]}
        >
          <MaterialIcons name="search" size={22} color={theme.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search providers or messages"
            placeholderTextColor={theme.muted}
            style={[styles.searchInput, { color: theme.foreground }]}
            accessibilityLabel="Search provider conversations"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery("")}
              hitSlop={10}
            >
              <MaterialIcons name="close" size={20} color={theme.muted} />
            </Pressable>
          )}
        </View>

        <View style={styles.filters}>
          {(["all", "unread"] as const).map((value) => {
            const selected = filter === value;
            const unreadCount = conversations.reduce(
              (count, conversation) => count + conversation.unreadCount,
              0,
            );
            return (
              <Pressable
                key={value}
                onPress={() => setFilter(value)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[
                  styles.filter,
                  {
                    backgroundColor: selected ? theme.primary : theme.card,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: selected ? "#FFFFFF" : theme.foreground },
                  ]}
                >
                  {value === "all" ? "All" : "Unread"}
                </Text>
                {value === "unread" && unreadCount > 0 && (
                  <View
                    style={[
                      styles.countBadge,
                      {
                        backgroundColor: selected ? "#FFFFFF" : theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countText,
                        { color: selected ? theme.primary : "#FFFFFF" },
                      ]}
                    >
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {actionError && (
          <Text style={[styles.errorText, { color: theme.error }]}>
            {actionError}
          </Text>
        )}
        {error && conversations.length > 0 ? (
          <Text style={[styles.offlineNote, { color: theme.muted }]}>
            Offline — showing saved conversations. Pull to refresh when you’re
            back online.
          </Text>
        ) : null}
        {loading && conversations.length === 0 ? (
          <View style={styles.state}>
            <ActivityIndicator color={theme.primary} size="large" />
            <Text style={[styles.stateText, { color: theme.muted }]}>
              Loading your conversations…
            </Text>
          </View>
        ) : error && conversations.length === 0 ? (
          <View style={styles.state}>
            <MaterialIcons
              name="chat-bubble-outline"
              size={36}
              color={theme.muted}
            />
            <Text style={[styles.stateText, { color: theme.error }]}>
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refresh()}
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={visibleConversations}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void refresh()}
                tintColor={theme.primary}
              />
            }
            ListHeaderComponent={
              startableContacts.length > 0 ? (
                <View style={styles.section}>
                  <Text
                    style={[styles.sectionTitle, { color: theme.foreground }]}
                  >
                    Eligible providers
                  </Text>
                  {startableContacts.map((contact) => {
                    const key = `${contact.bookingId ?? ""}:${contact.purchaseId ?? ""}`;
                    const opening = openingKey === key;
                    return (
                      <ContactRow
                        key={`${key}:${contact.id}`}
                        contact={contact}
                        opening={opening}
                        onPress={() => void handleOpenContact(contact)}
                      />
                    );
                  })}
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <ConversationRow
                conversation={item}
                onPress={() => navigateToConversation(item)}
              />
            )}
            ListEmptyComponent={
              startableContacts.length > 0 ? null : (
                <View style={styles.empty}>
                  <MaterialIcons name="forum" size={38} color={theme.muted} />
                  <Text
                    style={[styles.emptyTitle, { color: theme.foreground }]}
                  >
                    {filter === "unread"
                      ? "No unread messages"
                      : "No provider conversations"}
                  </Text>
                  <Text style={[styles.stateText, { color: theme.muted }]}>
                    {filter === "unread"
                      ? "You’re all caught up."
                      : "Provider chats appear here when the backend confirms an eligible booking or purchase."}
                  </Text>
                </View>
              )
            }
            ListFooterComponent={
              error && conversations.length > 0 ? (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {error}
                </Text>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );

  function ConversationRow({
    conversation,
    onPress,
  }: {
    conversation: ChatConversation;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${conversation.contact.name}, ${conversation.unreadCount} unread messages`}
        onPress={onPress}
        style={[styles.conversationRow, { borderBottomColor: theme.border }]}
      >
        <Avatar contact={conversation.contact} />
        <View style={styles.rowCopy}>
          <View style={styles.rowTitle}>
            <Text
              numberOfLines={1}
              style={[styles.contactName, { color: theme.foreground }]}
            >
              {conversation.contact.name}
            </Text>
            <Text style={[styles.time, { color: theme.muted }]}>
              {conversation.lastMessage
                ? formatRelativeTime(conversation.lastMessage.createdAt)
                : conversation.createdAt
                  ? formatRelativeTime(conversation.createdAt)
                  : ""}
            </Text>
          </View>
          <View style={styles.rowTitle}>
            <Text style={[styles.contactType, { color: theme.primary }]}>
              {formatContactType(conversation.contact.type)}
            </Text>
            {!conversation.eligible ? (
              <Text style={[styles.readOnlyBadge, { color: theme.muted }]}>
                Read only
              </Text>
            ) : null}
            {conversation.unreadCount > 0 && (
              <View
                style={[styles.countBadge, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.countText, { color: "#FFFFFF" }]}>
                  {conversation.unreadCount}
                </Text>
              </View>
            )}
          </View>
          <Text
            numberOfLines={1}
            style={[styles.preview, { color: theme.muted }]}
          >
            {conversation.lastMessage?.content ?? "No messages yet"}
          </Text>
          {(conversation.bookingId || conversation.purchaseId) && (
            <Text style={[styles.serviceContext, { color: theme.muted }]}>
              {conversation.bookingId
                ? `Booking #${conversation.bookingId}`
                : `Purchase #${conversation.purchaseId}`}
            </Text>
          )}
          {!conversation.eligible && (
            <Text style={[styles.ineligibleText, { color: theme.error }]}>
              <MaterialIcons name="lock" /> Read Only!
            </Text>
          )}
        </View>
        <MaterialIcons name="chevron-right" size={24} color={theme.subtle} />
      </Pressable>
    );
  }

  function ContactRow({
    contact,
    opening,
    onPress,
  }: {
    contact: EligibleChatContact;
    opening: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Start conversation with ${contact.name}`}
        disabled={opening}
        onPress={onPress}
        style={[styles.contactRow, { borderColor: theme.border }]}
      >
        <Avatar contact={contact} />
        <View style={styles.rowCopy}>
          <Text style={[styles.contactName, { color: theme.foreground }]}>
            {contact.name}
          </Text>
          <Text style={[styles.contactType, { color: theme.primary }]}>
            {formatContactType(contact.type)}
          </Text>
          <Text style={[styles.preview, { color: theme.muted }]}>
            {contact.bookingId
              ? `Booking #${contact.bookingId}`
              : `Purchase #${contact.purchaseId}`}
          </Text>
        </View>
        {opening ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <MaterialIcons name="chat" size={22} color={theme.primary} />
        )}
      </Pressable>
    );
  }

  function Avatar({
    contact,
  }: {
    contact: { name: string; photoUrl: string | null };
  }) {
    return contact.photoUrl ? (
      <Image source={{ uri: contact.photoUrl }} style={styles.avatar} />
    ) : (
      <View
        style={[
          styles.avatar,
          styles.avatarFallback,
          { backgroundColor: theme.input, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.avatarText, { color: theme.primary }]}>
          {contact.name.trim().slice(0, 1).toLocaleUpperCase() || "?"}
        </Text>
      </View>
    );
  }
}

function formatContactType(type: string) {
  return type
    .toLocaleLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const elapsed = Date.now() - timestamp;
  if (elapsed < 60_000) return "Now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getConversationActivityTime(conversation: ChatConversation) {
  const value = conversation.lastMessage?.createdAt ?? conversation.createdAt;
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  viewport: {
    flex: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === "web" ? 18 : 0,
    paddingBottom: 18,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  headingCopy: { flex: 1, gap: 3 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 12, lineHeight: 17 },
  searchBox: {
    minHeight: 48,
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: Platform.OS === "web" ? 10 : -10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, minHeight: 44, fontSize: 14 },
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filter: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  filterText: { fontSize: 13, fontWeight: "700" },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 11, fontWeight: "800" },
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 20 },
  section: { gap: 9, paddingTop: 14, paddingBottom: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  contactRow: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  conversationRow: {
    minHeight: 82,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "800" },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  contactName: { flex: 1, fontSize: 15, fontWeight: "700" },
  contactType: { fontSize: 12, fontWeight: "700" },
  readOnlyBadge: { fontSize: 10, fontWeight: "700" },
  time: { fontSize: 11 },
  preview: { fontSize: 12, lineHeight: 17 },
  serviceContext: { fontSize: 10, lineHeight: 14 },
  ineligibleText: { fontSize: 11 },
  state: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 30,
  },
  stateText: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  retryButton: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
  errorText: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 13 },
  offlineNote: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 12,
    lineHeight: 17,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 30,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
});
