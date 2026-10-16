import { useState } from 'react';
import {
  ChatLocale,
  ChatMessage,
  chatbotService,
} from '../services/chatbot.service';

export interface ChatEntry extends ChatMessage {
  id: number;
  fallback?: boolean;
}

export const useChatbot = () => {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (text: string, locale: ChatLocale) => {
    const content = text.trim();
    if (!content || loading) return;

    const userMessage: ChatEntry = {
      id: Date.now(),
      role: 'user',
      content,
    };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setError(null);
    setLoading(true);

    try {
      const response = await chatbotService.send(conversation, locale);
      setMessages([
        ...conversation,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.reply,
          fallback: response.fallback,
        },
      ]);
      return true;
    } catch (err) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message !== userMessage),
      );
      setError(
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : 'Unable to send your message.',
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, error, sendMessage };
};
