const KEY = 'gym.session.v1';

// The backend authenticates with a bearer JWT (no cookies), so the token has to be kept
// client-side. localStorage survives refreshes; the README documents the XSS trade-off.
export const sessionStore = {
  read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  write(value) {
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      /* storage unavailable: the session lasts until reload */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
  token() {
    return this.read()?.token || null;
  },
};
