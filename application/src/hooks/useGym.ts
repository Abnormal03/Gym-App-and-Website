import { useState } from 'react';
import { gymService } from '../services/gym.service';
import { Gym } from '../types/gym.types';

export const useGyms = () => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gymDetails, setGymDetails] = useState<Gym | null>(null);

  const getErrorMessage = (err: unknown): string => {
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object' && 'message' in err) {
      const message = (err as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
    return 'Something went wrong';
  };

  const getGyms = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await gymService.getAll();
      setGyms(response);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getGymDetails = async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      const details = await gymService.getById(id);
      setGymDetails(details);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return {
    getGyms,
    getGymDetails,
    gymDetails,
    gyms,
    loading,
    error,
  };
};