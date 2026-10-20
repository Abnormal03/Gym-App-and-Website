import { api } from './client';

export const usersApi = {
  me: async () => (await api.get('/api/users/me')).user,
  updateMe: async (body) => (await api.put('/api/users/me', body)).user,
  changePassword: (body) => api.put('/api/users/change-password', body),
  preference: async () => (await api.get('/api/users/preference')).preference,
  updatePreference: async (body) => (await api.put('/api/users/preference', body)).preference,
};
