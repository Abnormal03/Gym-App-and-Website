import { api } from './client';

const open = { skipAuthRedirect: true, skipAuth: true }; // a wrong password must not look like an expired session

export const authApi = {
  // V1 envelope: { success, user, token }
  memberLogin: (body) => api.post('/api/auth/login', body, open),
  register: (body) => api.post('/api/auth/register', body, open),
  // V1 envelope: { success, admin, token }
  adminLogin: (body) => api.post('/api/auth/admin/login', body, open),
  // V2 envelope -> { token, mustChangePassword, user }
  providerLogin: (body) => api.post('/api/auth/provider/login', body, open),
  staffLogin: (body) => api.post('/api/auth/staff/login', body, open),
  me: () => api.get('/api/auth/me'),
  // Provider and staff accounts only
  changePassword: (body) => api.post('/api/auth/change-password', body),
};
