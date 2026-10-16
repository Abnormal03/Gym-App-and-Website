import { useState, useEffect } from 'react';
import { gymService } from '../services/gym.service';
import { Gym } from '../types/gym.types';

export const useGymDetail = (id: number) => {
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gymService.getById(id);
      setGym(data);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setError('Invalid gym ID');
      setLoading(false);
      return;
    }

    fetch();
  }, [id]);

  return { gym, loading, error, refetch: fetch };
};