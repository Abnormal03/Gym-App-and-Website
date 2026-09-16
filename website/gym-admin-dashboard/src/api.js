const BASE_URL = import.meta.env.VITE_API_BASE_URL

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  let data = null
  const text = await res.text()
  if (text) {
    try { data = JSON.parse(text) } catch { data = { message: text } }
  }

  if (!res.ok) {
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status)
  }
  return data
}

export const api = {
  
  adminLogin: (email, password) =>
    request('/api/auth/admin/login', { method: 'POST', body: { email, password } }),
  me: (token) => request('/api/admin/profile', { token }),

  
  listGyms: (token) => request('/api/gyms', { token }),
  getGym: (token, id) => request(`/api/gyms/${id}`, { token }),
  createGym: (token, body) => request('/api/gyms', { method: 'POST', body, token }),
  updateGym: (token, id, body) => request(`/api/gyms/${id}`, { method: 'PUT', body, token }),

  listPackages: (token, gymId) => request(`/api/packages?gym_id=${gymId}`, { token }),
  createPackage: (token, body) => request('/api/packages', { method: 'POST', body, token }),
  updatePackage: (token, id, body) => request(`/api/packages/${id}`, { method: 'PUT', body, token }),
  deactivatePackage: (token, id) => request(`/api/packages/${id}`, { method: 'DELETE', token }),

  bookingStats: (token) => request('/api/bookings/stats', { token }),
  bookingsForGym: (token, gymId) => request(`/api/bookings/gym/${gymId}`, { token }),
  confirmBooking: (token, id) => request(`/api/bookings/${id}/confirm`, { method: 'PUT', token }),
  checkInBooking: (token, id) => request(`/api/bookings/${id}/check-in`, { method: 'PUT', token }),
  cancelBooking: (token, id) => request(`/api/bookings/${id}/cancel`, { method: 'PUT', token }),
}

export { ApiError }
