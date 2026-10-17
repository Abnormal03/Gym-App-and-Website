import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gymService } from '../services/gym.service';
import { Gym } from '../types/gym.types';

export const useGymDetail = (id: number) => {
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const networkLoaded = useRef(false);

  const fetch = async () => {
    if (!gym) setLoading(true);
    setError(null);
    try {
      const data = await gymService.getById(id);
      networkLoaded.current = true;
      setGym(data);
      void AsyncStorage.setItem(`gymDetails:${id}`, JSON.stringify(data)).catch(() => undefined);
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

    let active = true;
    networkLoaded.current = false;
    void AsyncStorage.getItem(`gymDetails:${id}`).then((raw) => {
      if (!active || networkLoaded.current || !raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'id' in parsed && parsed.id === id) {
        setGym(parsed as Gym);
        setLoading(false);
      }
    }).catch(() => undefined);
    void fetch();
    return () => { active = false; };
  }, [id]);

  return { gym, loading, error, refetch: fetch };
};
