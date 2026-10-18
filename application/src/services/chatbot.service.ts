import api, { unwrapApiResponse } from './api';

export type ChatRole = 'user' | 'assistant';
export type ChatLocale = 'en' | 'am';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatbotResponse {
  success: boolean;
  fallback?: boolean;
  reply: string;
}

export const chatbotService = {
  send: async (
    messages: ChatMessage[],
    locale: ChatLocale,
  ): Promise<{ reply: string; fallback: boolean }> => {
    const response = await api.post<ChatbotResponse | { data: ChatbotResponse }>('/chatbot/messages', {
      locale,
      messages,
    });

    const normalized = unwrapApiResponse( response.data || response) as ChatbotResponse;
    if (!normalized?.success || !normalized.reply) {
      throw new Error('No chatbot response was returned.');
    }
    return { reply: normalized.reply, fallback: normalized.fallback ?? false };
  },
};
