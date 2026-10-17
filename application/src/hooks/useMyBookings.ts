import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookingService } from '../services/booking.service';
import { MyBooking } from '../types/booking.types';
import { useAuthStore } from '../store/auth.store';
import { mergeCachedBookings } from '../services/bookingCache.service';

export const useMyBookings = () => {
  const memberId = useAuthStore((state) => state.user?.id);
  const cacheKey = memberId ? `memberBookings:${memberId}` : null;
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const loadedFromServer = useRef(false);

  const fetchBookings = useCallback(async (isRefresh = false) => {
    const requestId = ++requestVersion.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await bookingService.getMyBookings();
      if (requestId !== requestVersion.current) return;
      loadedFromServer.current = true;
      const nextBookings = await mergeCachedBookings(memberId, res.bookings ?? []);
      setBookings(nextBookings);
      if (cacheKey) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(nextBookings)).catch(
          () => undefined,
        );
      }
    } catch (err: any) {
      if (requestId !== requestVersion.current) return;
      setError(
        typeof err === 'string'
          ? err
          : err?.message || "Failed to load your bookings.",
      );
    } finally {
      if (requestId === requestVersion.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [cacheKey, memberId]);

  useEffect(() => {
    requestVersion.current += 1;
    loadedFromServer.current = false;
    setBookings([]);
    setError(null);
    setLoading(true);
    setRefreshing(false);
    let active = true;
    if (cacheKey) {
      void AsyncStorage.getItem(cacheKey).then((cached) => {
        if (!active || loadedFromServer.current || !cached) return;
        const parsed: unknown = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setBookings(parsed as MyBooking[]);
          setLoading(false);
        }
      }).catch(() => undefined);
    }
    void fetchBookings();
    return () => {
      active = false;
      requestVersion.current += 1;
    };
  }, [cacheKey, fetchBookings]);

  const now = Date.now();
  const upcoming = bookings.filter(
    (booking) =>
      booking.status === 'pending' ||
      (booking.status === 'confirmed' &&
        new Date(booking.slotEnd).getTime() >= now),
  );

  const past = bookings.filter(
    (booking) =>
      booking.status === 'cancelled' ||
      booking.status === 'expired' ||
      booking.status === 'payment_failed' ||
      booking.status === 'checked_in' ||
      (booking.status === 'confirmed' &&
        new Date(booking.slotEnd).getTime() < now),
  );

  return {
    upcoming,
    past,
    loading,
    refreshing,
    error,
    refetch: () => fetchBookings(),
    onRefresh: () => fetchBookings(true),
  };
};
