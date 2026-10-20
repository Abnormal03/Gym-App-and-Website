import { api, clean } from './client';

export const chatApi = {
  threads: () => api.get('/api/chats'),
  messages: (threadId, params) => api.get(`/api/chats/${threadId}/messages`, clean(params)),
  send: (threadId, body) => api.post(`/api/chats/${threadId}/messages`, { body }),
  markRead: (threadId) => api.post(`/api/chats/${threadId}/read`),
};
