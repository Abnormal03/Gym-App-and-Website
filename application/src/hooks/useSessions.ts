import { useCallback, useEffect, useState } from 'react';
import { sessionService } from '../services/session.service';
import { ProviderSession } from '../types/session.types';

export const useSessions = () => {
  const [sessions, setSessions] = useState<ProviderSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const loadSessions = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setSessions(await sessionService.getMine());
    } catch (err) {
      setError(
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : 'Unable to load sessions',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const submitReview = async (
    sessionId: number,
    rating: number,
    comment: string,
  ) => {
    setReviewing(true);
    setActionError(null);
    try {
      await sessionService.review(sessionId, {
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      await loadSessions(true);
      return true;
    } catch (err) {
      setActionError(
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : 'Unable to submit review',
      );
      return false;
    } finally {
      setReviewing(false);
    }
  };

  return {
    sessions,
    loading,
    refreshing,
    error,
    actionError,
    reviewing,
    refresh: () => loadSessions(true),
    submitReview,
  };
};
