import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sessionService } from '../services/session.service';
import { ProviderSession } from '../types/session.types';
import { useAuthStore } from '../store/auth.store';
import { useFocusEffect } from 'expo-router';

export const useSessions = () => {
  const memberId = useAuthStore((state) => state.user?.id);
  const cacheKey = memberId ? `memberSessions:${memberId}` : null;
  const [sessions, setSessions] = useState<ProviderSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const loadedFromServer = useRef(false);

  const loadSessions = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const next = await sessionService.getMine();
      loadedFromServer.current = true;
      setSessions(next);
      if (cacheKey) void AsyncStorage.setItem(cacheKey, JSON.stringify(next)).catch(() => undefined);
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
  }, [cacheKey]);

  useEffect(() => {
    let active = true;
    loadedFromServer.current = false;
    if (cacheKey) {
      void AsyncStorage.getItem(cacheKey).then((raw) => {
        if (!active || loadedFromServer.current || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSessions(parsed as ProviderSession[]);
          setLoading(false);
        }
      }).catch(() => undefined);
    }
    return () => { active = false; };
  }, [cacheKey, loadSessions]);

  useFocusEffect(useCallback(() => {
    void loadSessions();
  }, [loadSessions]));

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
