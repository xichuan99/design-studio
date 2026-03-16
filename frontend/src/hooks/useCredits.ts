import { useState, useCallback, useEffect, useRef } from 'react';
import { useProjectApi } from '@/lib/api';

export function useCredits() {
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getUserProfile } = useProjectApi();

  const getUserProfileRef = useRef(getUserProfile);
  getUserProfileRef.current = getUserProfile;

  const fetchCredits = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getUserProfileRef.current();
      if (res && typeof res.credits_remaining === 'number') {
        setCreditsRemaining(res.credits_remaining);
      }
    } catch (error) {
      console.error('Failed to fetch credits', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return {
    creditsRemaining,
    isLoading,
    refreshCredits: fetchCredits
  };
}
