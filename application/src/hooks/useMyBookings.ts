import { useState, useEffect, useCallback } from 'react';
import { bookingService } from '../services/booking.service';
import { MyBooking } from '../types/booking.types';

export const useMyBookings = () => {
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await bookingService.getMyBookings();
      setBookings(res.bookings);
    } catch (err: any) {
      setError(err.message || "failed to load your bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const upcoming = bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'pending'
  );

  const past = bookings.filter(
    (b) => b.status === 'cancelled' || b.status === 'checked_in'
  );

  return {
    upcoming,
    past,
    loading,
    refreshing,
    error,
    refetch: () => fetch(),
    onRefresh: () => fetch(true),
  };
};