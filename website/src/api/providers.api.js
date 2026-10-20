import { api, clean } from './client';

export const providersApi = {
  // Member token required
  search: async (params) => (await api.get('/api/providers/search', clean(params))).providers || [],
  reviews: async (id, params) => (await api.get(`/api/providers/${id}/reviews`, clean(params))).data,
  // Provider or admin token. `gymId` is required for admins.
  leaderboard: async (params) => (await api.get('/api/leaderboard/providers', clean(params))).data,
  // E-04 (unverified): profile with packages and availability, needed to pick a provider package.
  profile: (id) => api.get(`/api/v1/providers/${id}`),
  // Admin
  adminList: (params) =>
  api.get("/api/providers/admin/manage", {
    params: clean(params),
  }),

adminGet: (id) =>
  api.get(`/api/providers/admin/manage/${id}`),

adminCreate: (body) =>
  api.post("/api/providers", body),

adminUpdate: (id, body) =>
  api.patch(`/api/providers/admin/manage/${id}`, body),

adminResetPassword: (id) =>
  api.post(
    `/api/providers/admin/manage/${id}/reset-password`
  ),

adminReviews: (id) =>
  api.get(`/api/providers/${id}/reviews`),

  // adminList: (params) => api.get('/api/admin/providers', clean(params)),
  // adminGet: (id) => api.get(`/api/admin/providers/${id}`),
  // adminCreate: (body) => api.post('/api/admin/providers', body),
  // adminUpdate: (id, body) => api.patch(`/api/admin/providers/${id}`, body), // no type/email/gymId/password
  // adminResetPassword: (id) => api.post(`/api/admin/providers/${id}/reset-password`),
  // adminReviews: (id) => api.get(`/api/v1/admin/providers/${id}/reviews`), // unverified (E-66)
};
