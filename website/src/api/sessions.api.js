import { api, clean } from './client';

export const sessionsApi = {
  list: async (status) => (await api.get('/api/sessions', clean({ status }))).sessions || [],
  review: (id, body) => api.post(`/api/sessions/${id}/review`, body),
  
  complete: (id) => api.post(`/api/sessions/${id}/complete`),
  cancel: (id) => api.post(`/api/sessions/${id}/cancel`),
};
