import { api } from './client';
export const superAdminApi = {
  profile: () => api.get('/api/super-admin/profile'),
  registrations: (params = {}) => api.get('/api/super-admin/registrations', params),
  approve: (id, reason) => api.post(`/api/super-admin/registrations/${id}/approve`, reason ? { reason } : {}),
  reject: (id, reason) => api.post(`/api/super-admin/registrations/${id}/reject`, { reason }),
};
