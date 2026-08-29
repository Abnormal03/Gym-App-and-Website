import { useState } from 'react';
import { gymService } from '../services/gym.service';

export const useAvailability = (gymId: number) => {
  const [availability, setAvailability] = useState<{
    capacity: number;
    booked: number;
    available: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Call this when user picks a time slot
  const checkSlot = async (slotStart: string, slotEnd: string) => {
    setLoading(true);
    try {
      const data = await gymService.getAvailability(gymId, slotStart, slotEnd);
      setAvailability(data);
    } finally {
      setLoading(false);
    }
  };

  return { availability, loading, checkSlot };
};