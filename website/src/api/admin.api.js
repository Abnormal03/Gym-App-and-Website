import { api, clean } from './client';

export const adminApi = {
dashboard: async () =>
(await api.get('/api/admin/dashboard')).data,

profile: async () =>
(await api.get('/api/admin/profile')).admin,

// Load gyms belonging to the authenticated admin.
gyms: async () => {
const result = await api.get('/api/admin/gyms');

if (Array.isArray(result)) {
  return result;
}

return result?.gyms || [];

},
confirmRefund: (orderId, refundReference) =>
  api.post(`/api/admin/orders/${orderId}/refund-confirmed`, refundReference ? { refundReference } : {}),
// Load members, optionally filtered by the selected gym ID.
users: async (gymId) => {
const params = gymId ? { gymId } : undefined;

const result = await api.get('/api/admin/users', params);

if (Array.isArray(result)) {
  return result;
}

return result?.users || [];

},

deleteUser: (id) =>
api.delete(`/api/admin/users/${id}`),

// Staff
staffList: (params) =>
api.get('/api/admin/staff', clean(params)),

staffCreate: (body) =>
api.post('/api/admin/staff', body),

staffUpdate: (id, body) =>
api.patch(`/api/admin/staff/${id}`, body),

staffResetPassword: (id) =>
api.post(`/api/admin/staff/${id}/reset-password`),

// Payout requests
payouts: (status) =>
api.get('/api/admin/payouts', clean({ status })),

markPaid: (id, body) =>
api.post(`/api/admin/payouts/${id}/mark-paid`, body),

reject: (id, body) =>
api.post(`/api/admin/payouts/${id}/reject`, body),
};
