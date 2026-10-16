import { useCallback, useEffect, useRef, useState } from "react";
import { providerService } from "../services/provider.service";
import { Provider, ProviderType } from "../types/gym.types";

export const useProviderDetails = (
  providerId: number | null,
  type: ProviderType,
) => {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchProvider = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (providerId === null || !Number.isSafeInteger(providerId) || providerId <= 0) {
      setProvider(null);
      setError("Provider not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await providerService.findById(providerId, type);
      if (!result) {
        throw new Error("Provider not found.");
      }
      if (requestId.current === currentRequest) setProvider(result);
    } catch (err) {
      if (requestId.current === currentRequest) {
        setProvider(null);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load provider details.",
        );
      }
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [providerId, type]);

  useEffect(() => {
    void fetchProvider();
  }, [fetchProvider]);

  return { provider, loading, error, refetch: fetchProvider };
};
