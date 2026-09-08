import { useState, useEffect } from 'react';

interface CountdownResult {
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;   // "24:07"
}

export const useCountdown = (expiresAt: string | null): CountdownResult => {
  const getRemaining = () => {
    if (!expiresAt) return 0;
    return Math.max(0, new Date(expiresAt).getTime() - Date.now());
  };

  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const rem = getRemaining();
      setRemaining(rem);
      if (rem <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isExpired = remaining <= 0 && expiresAt !== null;

  return {
    minutes,
    seconds,
    isExpired,
    formatted: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  };
};