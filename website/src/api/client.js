import axios from 'axios';
import { API_ORIGIN } from '../config/env';
import { sessionStore } from '../utils/storage';
import { toApiError } from '../utils/errors';

const http = axios.create({
  baseURL: API_ORIGIN,
  timeout: 60000, // Render free instances can take 30-50 s to wake up
  headers: { 'Content-Type': 'application/json' },
});

// AuthContext registers handlers so the API layer never imports React state.
const handlers = { onUnauthorized: () => {}, onPasswordChangeRequired: () => {} };
export function registerAuthHandlers(next) {
  Object.assign(handlers, next);
}

http.interceptors.request.use((config) => {
  // Every request goes to API_ORIGIN (baseURL); the token is never sent anywhere else.
  const token = sessionStore.token();
  if (token && !config.skipAuth) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const RETRYABLE_STATUS = [502, 503, 504];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;
    // Only GET is retried. POST/PUT/PATCH/DELETE (payments, bookings, ...) are never repeated.
    const idempotent = (config.method || 'get').toLowerCase() === 'get';
    const transient = !error.response || RETRYABLE_STATUS.includes(status);
    if (idempotent && transient && !axios.isCancel(error)) {
      config.__retries = (config.__retries || 0) + 1;
      if (config.__retries <= 2) {
        await sleep(1500 * config.__retries);
        return http(config);
      }
    }
    const apiError = toApiError(error);
    if (status === 401 && !config.skipAuthRedirect) handlers.onUnauthorized(apiError);
    if (status === 403 && apiError.code === 'PASSWORD_CHANGE_REQUIRED') handlers.onPasswordChangeRequired(apiError);
    return Promise.reject(apiError);
  },
);

/**
 * Unwrap both backend envelopes:
 *  - V2: { data, error: null }      -> returns `data`
 *  - V1: { success: true, ...rest } -> returns the whole body
 */
function unwrap(body) {
  if (body && typeof body === 'object' && 'error' in body && 'data' in body) return body.data;
  return body;
}

export async function request(config) {
  const res = await http(config);
  return unwrap(res.data);
}

export const api = {
  get: (url, params, opts) => request({ method: 'get', url, params, ...opts }),
  post: (url, data, opts) => request({ method: 'post', url, data, ...opts }),
  put: (url, data, opts) => request({ method: 'put', url, data, ...opts }),
  patch: (url, data, opts) => request({ method: 'patch', url, data, ...opts }),
  delete: (url, opts) => request({ method: 'delete', url, ...opts }),
};

/** Wake a sleeping Render instance. Resolves true when the health check answers. */
export async function pingServer() {
  try {
    await http.get('/', { skipAuth: true, timeout: 70000 });
    return true;
  } catch {
    return false;
  }
}

/** First array found in a payload: the payload itself, one of the given keys, or `items`. */
export function asList(payload, ...keys) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const k of [...keys, 'items']) if (Array.isArray(payload[k])) return payload[k];
  return [];
}

/** Drop undefined/null/empty-string params so they never reach the URL. */
export function clean(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}
