import { api } from './client';

// Provider self-service. Every call below is `/api/v1/me/*`: documented in the V2 spec and the
// Postman collection but absent from Endpoints_Full.md, so each one is "unverified".
export const meApi = {
  profile: () => api.get('/api/me/provider'),
  updateProfile: (body) => api.put('/api/me/provider', body),
  availability: () => api.get('/api/me/availability'),
  replaceAvailability: (slots) => api.put('/api/me/availability', { slots }),
  packages: () => api.get('/api/me/packages'),
  createPackage: (body) => api.post('/api/me/packages', body),
  // Update/delete paths follow the "CRUD /me/packages" wording of the spec (assumed REST shape).
  updatePackage: (id, body) => api.put(`/api/me/packages/${id}`, body),
  deletePackage: (id) => api.delete(`/api/me/packages/${id}`),
  consultationPlan: () => api.get('/api/me/consultation-plan'),
  updateConsultationPlan: (body) => api.put('/api/me/consultation-plan', body),
  clients: () => api.get('/api/me/clients'),
  earnings: () => api.get('/api/me/earnings'),
  payouts: () => api.get('/api/me/payouts'),
  requestPayout: (body) => api.post('/api/me/payouts', body),
  badges: () => api.get('/api/me/badges'),
  stats: () => api.get('/api/me/stats'),
  streakLeaderboard: (gymId) => api.get(`/api/me/gyms/${gymId}/leaderboard/streaks`),
};
