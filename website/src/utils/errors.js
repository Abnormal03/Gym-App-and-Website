const FRIENDLY = {
  VALIDATION: 'Some of the information is invalid. Check the highlighted fields.',
  UNAUTHORIZED: 'Your session has ended. Sign in again.',
  FORBIDDEN: 'Your account is not allowed to do this.',
  PASSWORD_CHANGE_REQUIRED: 'You must change your temporary password first.',
  NOT_FOUND: 'We could not find what you were looking for.',
  ALREADY_EXISTS: 'An account with these details already exists.',
  CAPACITY_EXCEEDED: 'The gym does not have enough space left in that time slot.',
  PROVIDER_UNAVAILABLE: 'That coach is not available at the chosen time.',
  NO_CONSULTANT_AVAILABLE: 'No nutrition consultant is available right now.',
  ORDER_EXPIRED: 'This order expired. Start the booking again.',
  PACKAGE_RESTRICTED: 'This package does not allow the chosen day, time or group size.',
  SESSION_OUTSIDE_BOOKING: 'The session must fit inside your gym booking window.',
  OUTSIDE_GYM_OPENING_HOURS: 'The chosen time is outside the gym opening hours.',
};

/** Normalised error thrown by every API call. */
export class ApiError extends Error {
  constructor({ message, status = 0, code = null, details = null, network = false, timeout = false, unavailable = false }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.network = network;
    this.timeout = timeout;
    this.unavailable = unavailable;
  }
}

export function friendlyMessage(code, fallback) {
  if (code && FRIENDLY[code]) return FRIENDLY[code];
  return fallback || 'Something went wrong. Try again.';
}

/** Build an ApiError from an axios error. */
export function toApiError(err) {
  if (err instanceof ApiError) return err;
  const res = err?.response;
  if (!res) {
    const timeout = err?.code === 'ECONNABORTED';
    return new ApiError({
      network: true,
      timeout,
      message: timeout
        ? 'The server is taking too long to answer. It may be waking up, so try again in a moment.'
        : 'Cannot reach the server. Check your connection and try again.',
    });
  }
  const body = res.data && typeof res.data === 'object' ? res.data : {};
  const v2 = body.error && typeof body.error === 'object' ? body.error : null;
  // V1 checkout errors put an upper-case code in `message`; V2 uses error.code.
  const rawMessage = v2?.message || body.message || '';
  const v1Code = /^[A-Z_]{4,}$/.test(rawMessage) ? rawMessage : null;
  const code = v2?.code || v1Code || null;
  const url = err?.config?.url || '';
  const unavailable = res.status === 404 && url.includes('/api/v1/') && !v2?.code;
  const message = v1Code && FRIENDLY[v1Code] ? FRIENDLY[v1Code] : rawMessage || friendlyMessage(code, `Request failed (${res.status}).`);
  return new ApiError({ message, status: res.status, code, details: v2?.details || body.details || null, unavailable });
}

/** Field-level errors from the backend, when it sends them. */
export function fieldErrorsFrom(err) {
  const d = err?.details;
  if (!d) return {};
  if (Array.isArray(d)) {
    return d.reduce((acc, item) => {
      const key = Array.isArray(item.path) ? item.path.join('.') : item.field || item.path;
      if (key) acc[key] = item.message || 'Invalid value';
      return acc;
    }, {});
  }
  return typeof d === 'object' ? d : {};
}
