// src/services/api.ts
import axios from 'axios';
import { readItem } from './auth.storage';
import { BASE_URL } from './localBaseUrl';
import { useAuthStore } from '../store/auth.store';
import { isExpiredTokenError } from '../utils/authToken';


const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Services receive response.data from the Axios interceptor below. Keep this
// helper as an identity function so callers can handle each endpoint's envelope.
export const unwrapApiResponse = <T,>(response: T): T => response;

// Attach JWT token to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await readItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap response.data and normalize errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url ?? '');
    const authorization = error.config?.headers?.get?.('Authorization') ??
      error.config?.headers?.Authorization;
    const requestToken = typeof authorization === 'string'
      ? authorization.replace(/^Bearer\s+/i, '').trim()
      : '';
    const isAuthRequest = /\/auth\/(?:login|register)(?:\?|$)/i.test(requestUrl);
    const message =
      error.response?.data?.message || error.message || 'Something went wrong';
    const expiredSession = isExpiredTokenError(
      status,
      error.response?.data?.code,
      String(message),
    );
    if (expiredSession && requestToken && !isAuthRequest) {
      // RootLayout observes the cleared session and redirects to login.
      void useAuthStore.getState().logoutIfTokenMatches(requestToken);
    }
    return Promise.reject(message);
  }
);

export default api;
