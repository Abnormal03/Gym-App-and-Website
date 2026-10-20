import { api, clean } from './client';

// Gym staff (own gym) and gym admins (owner). V2 envelope.
export const checkinsApi = {
  scan: (token, gymId) => api.post('/api/checkins/scan', { token, gymId }, { skipAuthRedirect: true }),
  manual: (userId, gymId) => api.post('/api/checkins/manual', { userId, gymId }),
  today: (gymId) => api.get('/api/checkins/today', { gymId }),
  searchMembers: (gymId, q) => api.get('/api/staff/members', clean({ gymId, q })),
};
