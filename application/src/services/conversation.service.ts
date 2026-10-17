import api from "./api";
import {
  ChatContact,
  ChatConversation,
  ChatMessage,
  ChatMessagePage,
  ChatMessagePreview,
  EligibleChatContact,
} from "../types/chat.types";

type ApiRecord = Record<string, unknown>;

const asRecord = (value: unknown): ApiRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : null;

const requiredId = (value: unknown, label: string): number | string => {
  if (
    (typeof value === "number" && Number.isSafeInteger(value)) ||
    (typeof value === "string" && value.trim().length > 0)
  ) {
    return value;
  }
  throw new Error(`The conversation API returned an invalid ${label}.`);
};

const optionalId = (value: unknown): number | string | null => {
  if (
    (typeof value === "number" && Number.isSafeInteger(value)) ||
    (typeof value === "string" && value.trim().length > 0)
  ) {
    return value;
  }
  return null;
};

const unwrapResponse = (value: unknown): unknown => {
  let current = value;
  for (let depth = 0; depth < 3; depth += 1) {
    const record = asRecord(current);
    if (!record) return current;
    if (record.success === false) {
      const error = record.error;
      const nested = asRecord(error);
      const message =
        (typeof record.message === "string" && record.message) ||
        (typeof error === "string" && error) ||
        (typeof nested?.message === "string" && nested.message) ||
        "The conversation request failed.";
      throw new Error(message);
    }
    if (record.data !== undefined) {
      current = record.data;
      continue;
    }
    if (record.result !== undefined) {
      current = record.result;
      continue;
    }
    return current;
  }
  return current;
};

const normalizeContact = (value: unknown): ChatContact => {
  const contact = asRecord(value);
  const id = contact?.id ?? contact?.providerId ?? contact?.consultantId;
  const name =
    contact?.name ?? contact?.providerName ?? contact?.consultantName;
  const type =
    contact?.type ?? contact?.providerType ?? contact?.consultantType;
  if (
    !contact ||
    typeof name !== "string" ||
    typeof type !== "string"
  ) {
    throw new Error("The conversation API returned an invalid contact.");
  }
  return {
    id: requiredId(id, "contact ID"),
    name,
    type,
    photoUrl:
      typeof contact.photoUrl === "string"
        ? contact.photoUrl
        : typeof contact.avatarUrl === "string"
          ? contact.avatarUrl
          : null,
  };
};

const normalizePreview = (
  value: unknown,
  fallbackCreatedAt?: unknown,
): ChatMessagePreview | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    if (typeof fallbackCreatedAt !== "string") {
      throw new Error("The conversation API returned a last message without a timestamp.");
    }
    return { content: value, createdAt: fallbackCreatedAt };
  }
  const preview = asRecord(value);
  const content = preview?.content ?? preview?.body ?? preview?.preview;
  const createdAt = preview?.createdAt ?? preview?.sentAt ?? fallbackCreatedAt;
  if (!preview || typeof content !== "string" || typeof createdAt !== "string") {
    throw new Error("The conversation API returned an invalid last message.");
  }
  return {
    ...(optionalId(preview.id) !== null
      ? { id: optionalId(preview.id) as number | string }
      : {}),
    content,
    createdAt,
    ...(optionalId(preview.senderId) !== null
      ? { senderId: optionalId(preview.senderId) as number | string }
      : {}),
  };
};

const normalizeConversation = (value: unknown): ChatConversation => {
  const conversation = asRecord(value);
  // The current backend chat API returns ChatThread records as `otherParty`,
  // `writable`, and a last-message `body`. The mobile app's older conversation
  // shape is normalized here so both contracts stay out of the UI.
  const otherParty = asRecord(conversation?.otherParty);
  const eligibility = conversation?.eligible ?? conversation?.isEligible;
  const eligible =
    typeof eligibility === "boolean"
      ? eligibility
      : typeof conversation?.writable === "boolean"
        ? conversation.writable
        : typeof conversation?.eligibility === "string" &&
            conversation.eligibility.toLocaleUpperCase() === "ELIGIBLE"
          ? true
          : typeof conversation?.eligibility === "string" &&
              conversation.eligibility.toLocaleUpperCase() === "INELIGIBLE"
            ? false
            : null;
  if (!conversation || eligible === null) {
    throw new Error("The conversation API returned an invalid conversation.");
  }
  const unreadCount = Number(conversation.unreadCount);
  if (!Number.isSafeInteger(unreadCount) || unreadCount < 0) {
    throw new Error("The conversation API returned an invalid unread count.");
  }
  return {
    id: requiredId(conversation.id, "conversation ID"),
    createdAt:
      typeof conversation.createdAt === "string" ? conversation.createdAt : "",
    contact: normalizeContact(
      conversation.contact ??
        otherParty ??
        conversation.provider ??
        conversation.consultant ??
        conversation,
    ),
    eligible,
    bookingId: optionalId(
      conversation.bookingId ??
        conversation.relatedBookingId ??
        asRecord(conversation.booking)?.id,
    ),
    purchaseId: optionalId(
      conversation.purchaseId ??
        conversation.relatedPurchaseId ??
        asRecord(conversation.purchase)?.id,
    ),
    lastMessage: normalizePreview(
      (() => {
        const preview = asRecord(conversation.lastMessage);
        return preview
          ? { ...preview, content: preview.content ?? preview.body }
          : conversation.lastMessage ?? conversation.lastMessagePreview;
      })(),
      conversation.lastMessageAt,
    ),
    unreadCount,
  };
};

const normalizeEligibleContact = (value: unknown): EligibleChatContact => {
  const contact = asRecord(value);
  const eligibility = contact?.eligible ?? contact?.isEligible;
  const eligibilityFlag =
    typeof eligibility === "boolean"
      ? eligibility
      : typeof contact?.eligibility === "string"
        ? contact.eligibility.toLocaleUpperCase() === "ELIGIBLE"
          ? true
          : contact.eligibility.toLocaleUpperCase() === "INELIGIBLE"
            ? false
            : null
        : null;
  if (!contact || eligibilityFlag === null) {
    throw new Error("The conversation API returned an invalid eligible contact.");
  }
  const normalized = normalizeContact(
    contact.contact ?? contact.provider ?? contact.consultant ?? contact,
  );
  const bookingId = optionalId(
    contact.bookingId ??
      contact.relatedBookingId ??
      asRecord(contact.booking)?.id,
  );
  const purchaseId = optionalId(
    contact.purchaseId ??
      contact.relatedPurchaseId ??
      asRecord(contact.purchase)?.id,
  );
  if (eligibilityFlag && bookingId === null && purchaseId === null) {
    throw new Error("An eligible contact must have a related booking or purchase.");
  }
  return { ...normalized, bookingId, purchaseId, eligible: eligibilityFlag };
};

const normalizeMessage = (
  value: unknown,
  fallbackConversationId?: number | string,
): ChatMessage => {
  const message = asRecord(value);
  const sender = asRecord(message?.sender);
  // The chat API stores member and provider senders in separate nullable
  // columns. Prefer those columns over generic roles/IDs, which can overlap.
  const senderType = message?.senderUserId != null
    ? "MEMBER"
    : message?.senderProviderId != null
      ? "PROVIDER"
      : message?.senderType ?? message?.senderRole ?? sender?.type;
  const senderId =
    message?.senderUserId ?? message?.senderProviderId ?? message?.senderId ?? sender?.id;
  const conversationId = message?.conversationId ?? message?.threadId ?? fallbackConversationId;
  if (
    !message ||
    typeof senderType !== "string" ||
    typeof (message.content ?? message.body) !== "string" ||
    typeof (message.createdAt ?? message.sentAt ?? message.timestamp) !== "string" ||
    senderId === null ||
    senderId === undefined ||
    conversationId === null ||
    conversationId === undefined
  ) {
    throw new Error("The conversation API returned an invalid message.");
  }
  return {
    id: requiredId(message.id, "message ID"),
    conversationId: requiredId(conversationId, "conversation ID"),
    senderId: requiredId(senderId, "message sender ID"),
    senderType,
    content: (message.content ?? message.body) as string,
    createdAt: (message.createdAt ?? message.sentAt ?? message.timestamp) as string,
    readAt: typeof message.readAt === "string" ? message.readAt : null,
    isDeleted: message.deletedAt != null || message.isDeleted === true,
    editedAt: typeof message.editedAt === "string" ? message.editedAt : null,
  };
};

const normalizeList = (value: unknown) => {
  const unwrapped = unwrapResponse(value);
  if (Array.isArray(unwrapped)) {
    return {
      conversations: unwrapped.map(normalizeConversation),
      eligibleContacts: [],
    };
  }
  const response = asRecord(unwrapped);
  if (!response) {
    throw new Error("The conversation API returned an invalid inbox.");
  }
  if (!Array.isArray(response.conversations) || !Array.isArray(response.eligibleContacts)) {
    throw new Error("The conversation API did not return conversations and eligible contacts.");
  }
  return {
    conversations: response.conversations.map(normalizeConversation),
    eligibleContacts: response.eligibleContacts.map(normalizeEligibleContact),
  };
};

const normalizePage = (
  value: unknown,
  conversationId: number | string,
): ChatMessagePage => {
  const response = asRecord(unwrapResponse(value));
  const messages = response?.messages ?? response?.items;
  if (!response || !Array.isArray(messages)) {
    throw new Error("The conversation API returned an invalid message page.");
  }
  const pagination = asRecord(response.pagination);
  const nextCursor = response.nextCursor ?? pagination?.nextCursor;
  if (
    nextCursor !== null &&
    nextCursor !== undefined &&
    typeof nextCursor !== "string"
  ) {
    throw new Error("The conversation API returned an invalid pagination cursor.");
  }
  return {
    messages: messages.map((message) => normalizeMessage(message, conversationId)),
    nextCursor: typeof nextCursor === "string" ? nextCursor : null,
  };
};

export const conversationService = {
  list: async (): Promise<{
    conversations: ChatConversation[];
    eligibleContacts: EligibleChatContact[];
  }> => normalizeList(await api.get<unknown>("/chats")),

  open: async (target: {
    bookingId?: number | string;
    purchaseId?: number | string;
  }): Promise<{ conversation: ChatConversation }> => {
    if (target.bookingId === undefined && target.purchaseId === undefined) {
      throw new Error("A related booking or purchase is required to start a conversation.");
    }
    const response = asRecord(
      unwrapResponse(
        await api.post<unknown>("/member/conversations", target),
      ),
    );
    const conversation = normalizeConversation(
      response?.conversation ?? response?.thread ?? response,
    );
    if (!conversation.eligible) {
      throw new Error("This service is not eligible for provider messaging.");
    }
    return { conversation };
  },

  getMessages: async (
    conversationId: number | string,
    options: { cursor?: string | null; limit?: number } = {},
  ): Promise<ChatMessagePage> => {
    const { cursor, limit = 30 } = options;
    const response = await api.get<unknown>(
      `/chats/${encodeURIComponent(String(conversationId))}/messages`,
      {
        params: {
          limit,
          ...(cursor ? { before: cursor } : {}),
        },
      },
    );
    const unwrapped = unwrapResponse(response);
    const record = asRecord(unwrapped);
    if (record && Array.isArray(record.messages) && record.nextCursor === undefined) {
      const messages = record.messages.map((message) =>
        normalizeMessage(message, conversationId),
      );
      const oldest = messages.reduce<ChatMessage | null>(
        (min, m) =>
          !min || new Date(m.createdAt).getTime() < new Date(min.createdAt).getTime() ? m : min,
        null,
      );
      return {
        messages,
        nextCursor: messages.length === limit && oldest ? String(oldest.id) : null,
      };
    }
    return normalizePage(response, conversationId);
  },

  sendMessage: async (
    conversationId: number | string,
    content: string,
  ): Promise<ChatMessage> => {
    const normalizedContent = content.trim();
    if (!normalizedContent) throw new Error("Enter a message before sending.");
    const response = asRecord(
      unwrapResponse(
        await api.post<unknown>(
          `/chats/${encodeURIComponent(String(conversationId))}/messages`,
          { body: normalizedContent },
        ),
      ),
    );
    return normalizeMessage(response?.message ?? response, conversationId);
  },

  editMessage: async (
    conversationId: number | string,
    messageId: number | string,
    body: string,
  ): Promise<ChatMessage> => {
    const normalizedBody = body.trim();
    if (!normalizedBody) throw new Error("Enter a message before saving.");
    const response = asRecord(unwrapResponse(await api.patch<unknown>(
      `/chats/${encodeURIComponent(String(conversationId))}/messages/${encodeURIComponent(String(messageId))}`,
      { body: normalizedBody },
    )));
    return normalizeMessage(response?.message ?? response, conversationId);
  },

  deleteMessage: async (
    conversationId: number | string,
    messageId: number | string,
  ): Promise<ChatMessage> => {
    const response = asRecord(unwrapResponse(await api.delete<unknown>(
      `/chats/${encodeURIComponent(String(conversationId))}/messages/${encodeURIComponent(String(messageId))}`,
    )));
    return normalizeMessage(response?.message ?? response, conversationId);
  },

  markRead: async (conversationId: number | string): Promise<void> => {
    await api.post<unknown>(
      `/chats/${encodeURIComponent(String(conversationId))}/read`,
    );
  },

  normalizeRealtimeMessage: (value: unknown, conversationId: number | string) =>
    normalizeMessage(value, conversationId),
};
