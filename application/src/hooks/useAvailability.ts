// src/hooks/useAvailability.ts
import { useState } from 'react';
import { gymService } from '../services/gym.service';
import { Availability } from '../types/gym.types';

export const useAvailability = (gymId: number) => {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSlot = async (slotStart: string, slotEnd: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await gymService.getAvailability(gymId, slotStart, slotEnd);
      setAvailability(data);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  // Reset when user changes selection
  const reset = () => setAvailability(null);

  return { availability, loading, error, checkSlot, reset };
};