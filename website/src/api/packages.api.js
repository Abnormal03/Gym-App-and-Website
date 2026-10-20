import { api, clean } from './client';

export const packagesApi = {
  // Member view: active packages of one gym
  forGym: async (gymId) => (await api.get('/api/packages', { gym_id: gymId })).packages || [],
  // Admin CRUD (V2 envelope, paginated)
  adminList: (params) => api.get('/api/admin/gym-packages', clean(params)),
  adminCreate: (body) => api.post('/api/admin/gym-packages', body),
  adminUpdate: (id, body) => api.patch(`/api/admin/gym-packages/${id}`, body), // never include gymId
  adminDeactivate: (id) => api.delete(`/api/admin/gym-packages/${id}`),
};
