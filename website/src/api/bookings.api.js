import { api, clean } from './client';

export const bookingsApi = {
  list: async (status) => (await api.get('/api/bookings', clean({ status }))).bookings || [],
  get: async (id) => (await api.get(`/api/bookings/${id}`)).booking,
  cancel: (id) => api.post(`/api/bookings/${id}/cancel`),
  addSession: async (bookingId, body) => (await api.post(`/api/bookings/${bookingId}/sessions`, body)).session,
  // Admin
  forGym: async (gymId) => (await api.get(`/api/bookings/gym/${gymId}`)).bookings || [],
  stats: async () => (await api.get('/api/bookings/stats')).stats,
  adminCancel: (id) => api.put(`/api/bookings/${id}/cancel`),
  confirm: (id) => api.put(`/api/bookings/${id}/confirm`),
  checkIn: (id) => api.put(`/api/bookings/${id}/check-in`),
  // V2 spec (E-65): marks ATTENDED and feeds streaks/badges. Not in Endpoints_Full.md -> unverified.
  attend: (id) => api.post(`/api/admin/bookings/${id}/attend`),
};
