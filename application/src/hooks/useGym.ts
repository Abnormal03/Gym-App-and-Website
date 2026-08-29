import { useState, useEffect } from 'react';
import { gymService } from '../services/gym.service';
import { Gym } from '../types/gym.types';

export const useGyms = () => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await gymService.getAll();
        setGyms(data);
      } catch (err) {
        setError(err as string);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { gyms, loading, error };
};