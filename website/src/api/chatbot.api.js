import { api } from './client';

export const chatbotApi = {
  send: (messages, locale) => api.post('/api/chatbot/messages', { messages, locale }),
};
