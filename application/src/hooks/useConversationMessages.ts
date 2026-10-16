import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { conversationService } from "../services/conversation.service";
import { ChatMessage } from "../types/chat.types";
import { useAuthStore } from "../store/auth.store";

const PAGE_SIZE = 30;

const getErrorMessage = (error: unknown, fallback: string) =>
  typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : fallback;

const mergeMessages = (existing: ChatMessage[], incoming: ChatMessage[]) => {
  const messagesById = new Map<string, ChatMessage>();
  for (const message of [...existing, ...incoming]) {
    messagesById.set(String(message.id), message);
  }
  return [...messagesById.values()].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
};

export const useConversationMessages = (conversationId: string | null) => {
  const memberId = useAuthStore((state) => state.user?.id);
  const cacheKey =
    memberId && conversationId
      ? `chatMessages:${memberId}:${conversationId}`
      : null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const conversationVersion = useRef(0);
  const messagesRef = useRef<ChatMessage[]>([]);

  const applyMessages = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
    if (cacheKey) {
      void AsyncStorage.setItem(cacheKey, JSON.stringify(next.slice(-500))).catch(
        () => undefined,
      );
    }
  }, [cacheKey]);

  const loadPage = useCallback(
    async (refresh = false) => {
      if (!conversationId) {
        setLoading(false);
        return;
      }
      const requestVersion = conversationVersion.current;
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const page = await conversationService.getMessages(conversationId, {
          limit: PAGE_SIZE,
        });
        if (requestVersion !== conversationVersion.current) return;
        applyMessages(mergeMessages(messagesRef.current, page.messages));
        setNextCursor(page.nextCursor);
        // Reading the thread marks incoming provider messages as read on the server.
        void conversationService.markRead(conversationId).catch(() => undefined);
      } catch (loadError) {
        if (requestVersion !== conversationVersion.current) return;
        setError(getErrorMessage(loadError, "Unable to load messages."));
      } finally {
        if (requestVersion === conversationVersion.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [applyMessages, conversationId],
  );

  useEffect(() => {
    conversationVersion.current += 1;
    messagesRef.current = [];
    setMessages([]);
    setNextCursor(null);
    setRefreshing(false);
    setLoadingOlder(false);
    setSending(false);
    setError(null);
    setSendError(null);
    if (conversationId) {
      const requestVersion = conversationVersion.current;
      void (async () => {
        if (cacheKey) {
          try {
            const cached = await AsyncStorage.getItem(cacheKey);
            if (requestVersion !== conversationVersion.current || !cached) return;
            const parsed: unknown = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const cachedMessages = parsed as ChatMessage[];
              messagesRef.current = cachedMessages;
              setMessages(cachedMessages);
            }
          } catch {
            // Cached messages are best-effort; the server remains authoritative.
          }
        }
        if (requestVersion === conversationVersion.current) void loadPage();
      })();
    } else {
      setLoading(false);
    }
    return () => {
      conversationVersion.current += 1;
    };
  }, [cacheKey, conversationId, loadPage]);

  const loadOlder = async () => {
    if (!conversationId || !nextCursor || loadingOlder) return;
    const requestVersion = conversationVersion.current;
    setLoadingOlder(true);
    setError(null);
    try {
      const page = await conversationService.getMessages(conversationId, {
        cursor: nextCursor,
        limit: PAGE_SIZE,
      });
      if (requestVersion !== conversationVersion.current) return;
      applyMessages(mergeMessages(messagesRef.current, page.messages));
      setNextCursor(page.nextCursor);
    } catch (loadError) {
      if (requestVersion !== conversationVersion.current) return;
      setError(getErrorMessage(loadError, "Unable to load older messages."));
    } finally {
      if (requestVersion === conversationVersion.current) setLoadingOlder(false);
    }
  };

  const send = async (content: string) => {
    if (!conversationId || !content.trim() || sending) return false;
    const requestVersion = conversationVersion.current;
    setSending(true);
    setSendError(null);
    try {
      const message = await conversationService.sendMessage(
        conversationId,
        content,
      );
      if (requestVersion !== conversationVersion.current) return false;
      applyMessages(mergeMessages(messagesRef.current, [message]));
      return true;
    } catch (sendFailure) {
      if (requestVersion !== conversationVersion.current) return false;
      setSendError(getErrorMessage(sendFailure, "Unable to send this message."));
      return false;
    } finally {
      if (requestVersion === conversationVersion.current) setSending(false);
    }
  };

  const refresh = useCallback(() => loadPage(true), [loadPage]);

  return {
    messages,
    loading,
    refreshing,
    loadingOlder,
    sending,
    error,
    sendError,
    hasOlderMessages: Boolean(nextCursor),
    refresh,
    loadOlder,
    send,
  };
};
