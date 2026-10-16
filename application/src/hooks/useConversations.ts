import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { conversationService } from "../services/conversation.service";
import { useAuthStore } from "../store/auth.store";
import {
  ChatConversation,
  EligibleChatContact,
} from "../types/chat.types";

const getErrorMessage = (error: unknown, fallback: string) =>
  typeof error === "string"
    ? error
    : error instanceof Error
      ? error.message
      : fallback;

export const useConversations = () => {
  const memberId = useAuthStore((state) => state.user?.id);
  const cacheKey = memberId ? `memberConversations:${memberId}` : null;
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [eligibleContacts, setEligibleContacts] = useState<EligibleChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const loadedFromServer = useRef(false);

  const load = useCallback(async (refresh = false) => {
    const requestId = ++requestVersion.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await conversationService.list();
      if (requestId !== requestVersion.current) return;
      loadedFromServer.current = true;
      setConversations(result.conversations);
      setEligibleContacts(result.eligibleContacts);
      if (cacheKey) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(result.conversations)).catch(
          () => undefined,
        );
      }
    } catch (loadError) {
      if (requestId !== requestVersion.current) return;
      setError(getErrorMessage(loadError, "Unable to load your conversations."));
    } finally {
      if (requestId === requestVersion.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [cacheKey]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadedFromServer.current = false;
      if (cacheKey) {
        void AsyncStorage.getItem(cacheKey).then((cached) => {
          if (!active || loadedFromServer.current || !cached) return;
          const parsed: unknown = JSON.parse(cached);
          if (Array.isArray(parsed)) setConversations(parsed as ChatConversation[]);
        }).catch(() => undefined);
      }
      void load();
      return () => {
        active = false;
      };
    }, [cacheKey, load]),
  );

  const openConversation = async (
    contact: EligibleChatContact,
  ): Promise<ChatConversation | null> => {
    if (!contact.eligible) {
      setActionError("Messaging is available only for eligible confirmed bookings or purchases.");
      return null;
    }
    const key = `${contact.bookingId ?? ""}:${contact.purchaseId ?? ""}`;
    if (!contact.bookingId && !contact.purchaseId) {
      setActionError("The eligible contact is missing its related booking or purchase.");
      return null;
    }

    setOpeningKey(key);
    setActionError(null);
    try {
      const result = await conversationService.open({
        ...(contact.bookingId !== null ? { bookingId: contact.bookingId } : {}),
        ...(contact.purchaseId !== null ? { purchaseId: contact.purchaseId } : {}),
      });
      const updatedConversations = [
        result.conversation,
        ...conversations.filter((item) => item.id !== result.conversation.id),
      ];
      setConversations(updatedConversations);
      if (cacheKey) {
        void AsyncStorage.setItem(cacheKey, JSON.stringify(updatedConversations)).catch(
          () => undefined,
        );
      }
      return result.conversation;
    } catch (openError) {
      setActionError(getErrorMessage(openError, "Unable to open this conversation."));
      return null;
    } finally {
      setOpeningKey(null);
    }
  };

  return {
    conversations,
    eligibleContacts,
    loading,
    refreshing,
    error,
    actionError,
    openingKey,
    refresh: () => load(true),
    openConversation,
  };
};
