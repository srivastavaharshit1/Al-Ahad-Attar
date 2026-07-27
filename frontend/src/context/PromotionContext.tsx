import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { PromotionResponse } from '../types/promotion';
import { storePromotionService } from '../services/storePromotionService';

interface PromotionContextType {
  activePromotions: PromotionResponse[];
  isLoading: boolean;
  refreshPromotions: () => Promise<void>;
}

const PromotionContext = createContext<PromotionContextType>({
  activePromotions: [],
  isLoading: true,
  refreshPromotions: async () => {},
});

export const usePromotions = () => useContext(PromotionContext);

export const PromotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePromotions, setActivePromotions] = useState<PromotionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPromotions = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const data = await storePromotionService.getActivePromotions();
      setActivePromotions(data);
    } catch (error) {
      console.error('Failed to load active promotions:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    // 1. Fetch on route change
    fetchPromotions(activePromotions.length > 0);
  }, [location.pathname]);

  useEffect(() => {
    // 2. Fetch when tab regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPromotions(true);
      }
    };
    
    const handleFocus = () => {
      fetchPromotions(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // 3. Lightweight polling every 60 seconds to guarantee consistency
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPromotions(true);
      }
    }, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollInterval);
    };
  }, []); // Run setup once on mount

  return (
    <PromotionContext.Provider value={{ activePromotions, isLoading, refreshPromotions: fetchPromotions }}>
      {children}
    </PromotionContext.Provider>
  );
};
