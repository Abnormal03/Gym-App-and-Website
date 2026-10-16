import { useEffect, useState } from 'react';
import { providerService } from '../services/provider.service';
import { ProviderReview } from '../types/gym.types';

export const useProviderReviews = (providerId: number | null) => {
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (providerId === null) {
      setReviews([]);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    providerService
      .getReviews(providerId)
      .then((result) => {
        if (active) setReviews(result.items);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'Unable to load provider reviews',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [providerId]);

  return { reviews, loading, error };
};
