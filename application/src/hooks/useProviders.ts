import { useCallback, useEffect, useRef, useState } from 'react';
import { providerService } from '../services/provider.service';
import { Provider, ProviderType } from '../types/gym.types';

export const useProviders = (
  gymId?: number,
  type?: ProviderType,
  startsAt?: string,
  endsAt?: string,
) => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);
  const fetchProviders = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await providerService.search({ gymId, type, startsAt, endsAt });
      if (requestId.current === current) setProviders(result);
    } catch (err) {
       if (requestId.current !== current) return;
      setError(
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : 'Unable to load providers',
      );
    } finally {
       if (requestId.current === current) setLoading(false);
    }
  }, [gymId, type, startsAt, endsAt]);

  useEffect(() => {
    void fetchProviders();
  }, [fetchProviders]);

  return { providers, loading, error, refetch: fetchProviders };
};
