import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { gymsApi } from '../api/gyms.api';
import { useAuth } from './AuthContext';

const AdminGymContext = createContext(null);

/**
 * There is no "my gyms" endpoint. GET /api/gyms lists every gym without `adminId`, and only
 * GET /api/gyms/:id returns it, so we read each detail and keep the ones this admin owns.
 */
export function AdminGymProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ gyms: [], loading: true, error: null });
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const all = await gymsApi.list();
      const details = await Promise.all(all.map((g) => gymsApi.get(g.id).catch(() => null)));
      const mine = details.filter((g) => g && String(g.adminId) === String(user?.id));
      setState({ gyms: mine, loading: false, error: null });
      setSelectedId((cur) => (mine.some((g) => String(g.id) === String(cur)) ? cur : mine[0]?.id ?? null));
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const value = useMemo(
    () => ({
      ...state,
      gym: state.gyms.find((g) => String(g.id) === String(selectedId)) || null,
      selectGym: setSelectedId,
      reload: load,
    }),
    [state, selectedId, load],
  );
  return <AdminGymContext.Provider value={value}>{children}</AdminGymContext.Provider>;
}

export function useAdminGym() {
  const ctx = useContext(AdminGymContext);
  if (!ctx) throw new Error('useAdminGym must be used inside AdminGymProvider');
  return ctx;
}
