import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { PromotionResponse } from '../types/promotion';
import { storePromotionService } from '../services/storePromotionService';

interface PromotionContextType {
  activePromotions: PromotionResponse[];
  isLoading: boolean;
  refreshPromotions: () => Promise<void>;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5-minute cache TTL

const PromotionContext = createContext<PromotionContextType>({
  activePromotions: [],
  isLoading: true,
  refreshPromotions: async () => {},
});

export const usePromotions = () => useContext(PromotionContext);

export const PromotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePromotions, setActivePromotions] = useState<PromotionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const lastFetchTimeRef = useRef<number>(0);
  const inFlightPromiseRef = useRef<Promise<void> | null>(null);

  const fetchPromotions = useCallback(async (options: { silent?: boolean; force?: boolean } = {}) => {
    const { silent = false, force = false } = options;
    const now = Date.now();

    // Return in-flight request if already pending to prevent overlapping requests
    if (inFlightPromiseRef.current) {
      return inFlightPromiseRef.current;
    }

    // Serve from cache if fresh and not explicitly forced
    if (!force && lastFetchTimeRef.current > 0 && (now - lastFetchTimeRef.current) < CACHE_TTL_MS) {
      if (!silent) setIsLoading(false);
      return;
    }

    if (!silent && lastFetchTimeRef.current === 0) {
      setIsLoading(true);
    }

    const promise = (async () => {
      try {
        const data = await storePromotionService.getActivePromotions();
        setActivePromotions(data || []);
        lastFetchTimeRef.current = Date.now();
      } catch (error) {
        console.error('Failed to load active promotions:', error);
      } finally {
        setIsLoading(false);
        inFlightPromiseRef.current = null;
      }
    })();

    inFlightPromiseRef.current = promise;
    return promise;
  }, []);

  const refreshPromotions = useCallback(async () => {
    await fetchPromotions({ silent: false, force: true });
  }, [fetchPromotions]);

  useEffect(() => {
    // Initial fetch on mount
    fetchPromotions({ silent: false, force: false });

    // Handle tab visibility change: only refresh if visible and cache has expired
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleRevalidation = () => {
      if (document.visibilityState === 'visible') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const now = Date.now();
          if (now - lastFetchTimeRef.current >= CACHE_TTL_MS) {
            fetchPromotions({ silent: true, force: false });
          }
        }, 300);
      }
    };

    document.addEventListener('visibilitychange', handleRevalidation);
    window.addEventListener('focus', handleRevalidation);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener('visibilitychange', handleRevalidation);
      window.removeEventListener('focus', handleRevalidation);
    };
  }, [fetchPromotions]);

  const contextValue = useMemo(() => ({
    activePromotions,
    isLoading,
    refreshPromotions
  }), [activePromotions, isLoading, refreshPromotions]);

  return (
    <PromotionContext.Provider value={contextValue}>
      {children}
    </PromotionContext.Provider>
  );
};
