import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../api/auth.api';
import { registerAuthHandlers } from '../api/client';
import { sessionStore } from '../utils/storage';
import { ROLE_HOME } from '../config/roles';

const AuthContext = createContext(null);

/** Turn each login response into the same { token, role, user, mustChangePassword } shape. */
function parseLogin(kind, res) {
  if (kind === 'member') return { token: res.token, role: 'MEMBER', user: res.user, mustChangePassword: false };
  if (kind === 'admin') return { token: res.token, role: 'GYM_ADMIN', user: res.admin, mustChangePassword: false };
  // provider + staff: V2 envelope already unwrapped to { token, mustChangePassword, user }
  return {
    token: res.token,
    role: res.user.role,
    user: res.user,
    mustChangePassword: Boolean(res.mustChangePassword ?? res.user?.mustChangePassword),
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => sessionStore.read());
  const [status, setStatus] = useState(() => (sessionStore.read()?.token ? 'loading' : 'anonymous'));
  const [sessionExpired, setSessionExpired] = useState(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const persist = useCallback((next) => {
    sessionStore.write(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    sessionStore.clear();
    setSession(null);
    setStatus('anonymous');
  }, []);

  // Central handling of 401 / PASSWORD_CHANGE_REQUIRED coming from the Axios interceptor.
  useEffect(() => {
    registerAuthHandlers({
      onUnauthorized: () => {
        if (!sessionRef.current) return;
        setSessionExpired(true);
        logout();
      },
      onPasswordChangeRequired: () => {
        const cur = sessionRef.current;
        if (cur && !cur.mustChangePassword) persist({ ...cur, mustChangePassword: true });
      },
    });
  }, [logout, persist]);

  // Restore the session after a refresh: validate the stored token with /auth/me.
  useEffect(() => {
    const stored = sessionStore.read();
    if (!stored?.token) {
      setStatus('anonymous');
      return undefined;
    }
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (cancelled) return;
        // Provider/staff return a full profile; member/admin only { role, id }.
        const merged = { ...stored, role: me?.role || stored.role, user: { ...stored.user, ...(me?.name ? me : {}) } };
        persist(merged);
        setStatus('authenticated');
      })
      .catch((e) => {
        if (cancelled) return;
        // 401 is handled by the interceptor. For network failures keep the session and let pages show errors.
        if (e.status === 401) return;
        setStatus('authenticated');
      });
    return () => {
      cancelled = true;
    };
  }, [persist]);

  const login = useCallback(
    async (kind, credentials) => {
      const call = { member: authApi.memberLogin, admin: authApi.adminLogin, provider: authApi.providerLogin, staff: authApi.staffLogin }[kind];
      const parsed = parseLogin(kind, await call(credentials));
      if (!parsed.token) throw new Error('The server did not return a token.');
      setSessionExpired(false);
      persist(parsed);
      setStatus('authenticated');
      return parsed;
    },
    [persist],
  );

  const register = useCallback(
    async (body) => {
      const res = await authApi.register(body);
      const parsed = parseLogin('member', res);
      persist(parsed);
      setStatus('authenticated');
      return parsed;
    },
    [persist],
  );

  const updateUser = useCallback(
    (patch) => {
      const cur = sessionRef.current;
      if (cur) persist({ ...cur, user: { ...cur.user, ...patch } });
    },
    [persist],
  );

  const passwordChanged = useCallback(() => {
    const cur = sessionRef.current;
    if (cur) persist({ ...cur, mustChangePassword: false, user: { ...cur.user, mustChangePassword: false } });
  }, [persist]);

  const value = useMemo(
    () => ({
      status,
      isAuthenticated: status === 'authenticated' && Boolean(session?.token),
      user: session?.user || null,
      role: session?.role || null,
      mustChangePassword: Boolean(session?.mustChangePassword),
      home: session?.role ? ROLE_HOME[session.role] || '/' : '/',
      sessionExpired,
      login,
      register,
      logout,
      updateUser,
      passwordChanged,
    }),
    [status, session, sessionExpired, login, register, logout, updateUser, passwordChanged],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
