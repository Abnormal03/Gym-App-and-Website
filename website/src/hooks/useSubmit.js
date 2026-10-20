import { useCallback, useRef, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { fieldErrorsFrom } from '../utils/errors';

/**
 * Wraps a submit handler: blocks double submits, tracks pending state, surfaces API errors.
 * `run(fn, { success, silent })` returns the result or undefined on failure.
 */
export function useSubmit() {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const lock = useRef(false);

  const run = useCallback(
    async (fn, { success, silent = false } = {}) => {
      if (lock.current) return undefined;
      lock.current = true;
      setPending(true);
      setError(null);
      setFieldErrors({});
      try {
        const result = await fn();
        if (success) toast.success(success);
        return result ?? true;
      } catch (e) {
        setError(e);
        setFieldErrors(fieldErrorsFrom(e));
        if (!silent) toast.error(e.message);
        return undefined;
      } finally {
        lock.current = false;
        setPending(false);
      }
    },
    [toast],
  );

  return { run, pending, error, fieldErrors, clearError: () => setError(null) };
}
