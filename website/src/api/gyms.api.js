import { api, clean } from './client';
import { GYM_SEARCH_NAME_KEY } from '../config/apiShape';

export const gymsApi = {
  list: async () => (await api.get('/api/gyms')).gyms || [],
  // At least one of name / location is required by the backend.
  search: async ({ name, location }) =>
    (await api.get('/api/gyms/search', clean({ [GYM_SEARCH_NAME_KEY]: name, location }))).gyms || [],
  get: async (id) => (await api.get(`/api/gyms/${id}`)).gymDetails,
  availability: async (id, slotStart, slotEnd) =>
    (await api.get(`/api/gyms/${id}/availability`, { slot_start: slotStart, slot_end: slotEnd })).available,
  create: async (body) => (await api.post('/api/gyms', body)).gym,
  update: async (id, body) => (await api.put(`/api/gyms/${id}`, body)).updatedGym,
};
