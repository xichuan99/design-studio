import { useState, useCallback, useEffect } from 'react';
import { useProjectApi } from '@/lib/api';

export function useCredits() {
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getUserProfile } = useProjectApi();

  const fetchCredits = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getUserProfile();
      if (res && typeof res.credits_remaining === 'number') {
        setCreditsRemaining(res.credits_remaining);
      }
    } catch (error) {
      console.error('Failed to fetch credits', error);
    } finally {
      setIsLoading(false);
    }
  }, [getUserProfile]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return {
    creditsRemaining,
    isLoading,
    refreshCredits: fetchCredits
  };
}
