import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Run an async function on mount / when deps change.
 * Returns { data, error, loading, reload, setData }. Stale responses are ignored.
 */
export function useAsync(fn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const counter = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async () => {
    const id = ++counter.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (id === counter.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (id === counter.current) setState((s) => ({ data: s.data, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }
    run();
    return () => {
      counter.current += 1; // invalidate in-flight request
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: run, setData };
}
