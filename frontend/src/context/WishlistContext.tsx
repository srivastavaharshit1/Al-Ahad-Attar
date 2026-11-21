import React, { createContext, useState, useEffect, useContext, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { storage } from '../utils/storage';
import { wishlistService } from '../services/wishlistService';
import { AuthContext } from './AuthContext';
import toast from 'react-hot-toast';

interface WishlistContextType {
  productIds: string[];
  addToWishlist: (variantId: string) => void;
  removeFromWishlist: (variantId: string) => void;
  isInWishlist: (variantId: string) => boolean;
}

export const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [productIds, setProductIds] = useState<string[]>(() => {
    return storage.get<string[]>('wishlist', []);
  });
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated;
  const isFirstMount = useRef(true);

  // Track in-flight mutations per variantId to prevent rapid-click race conditions.
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch wishlist from backend
      wishlistService.getWishlist().then(res => {
        if (res.data) {
          const dbIds = res.data.map(item => item.variant.id.toString());
          // Sync local items that aren't in DB
          setProductIds(prev => {
            const localOnly = prev.filter(id => !dbIds.includes(id));
            localOnly.forEach(id => wishlistService.addToWishlist(Number(id)).catch(console.error));
            return Array.from(new Set([...dbIds, ...prev]));
          });
        }
      }).catch(console.error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (isFirstMount.current) {
        isFirstMount.current = false;
        return;
      }
      storage.set('wishlist', productIds);
    }
  }, [productIds, isAuthenticated]);

  const addToWishlist = useCallback((variantId: string) => {
    // Prevent duplicate concurrent request for the same variant
    if (inFlight.current.has(variantId)) return;

    // --- OPTIMISTIC UPDATE: change UI immediately ---
    setProductIds(prev => {
      if (prev.includes(variantId)) return prev;
      return [...prev, variantId];
    });

    if (isAuthenticated) {
      inFlight.current.add(variantId);
      wishlistService.addToWishlist(Number(variantId))
        .then(() => {
          toast.success('Added to wishlist');
        })
        .catch((err) => {
          console.error('Failed to add to remote wishlist', err);
          // --- ROLLBACK on failure ---
          setProductIds(prev => prev.filter(id => id !== variantId));
          toast.error('Failed to add to wishlist');
        })
        .finally(() => {
          inFlight.current.delete(variantId);
        });
    } else {
      toast.success('Added to wishlist');
    }
  }, [isAuthenticated]);

  const removeFromWishlist = useCallback((variantId: string) => {
    // Prevent duplicate concurrent request for the same variant
    if (inFlight.current.has(variantId)) return;

    // --- OPTIMISTIC UPDATE: change UI immediately ---
    setProductIds(prev => prev.filter(id => id !== variantId));

    if (isAuthenticated) {
      inFlight.current.add(variantId);
      wishlistService.removeFromWishlist(Number(variantId))
        .then(() => {
          toast.success('Removed from wishlist');
        })
        .catch((err) => {
          console.error('Failed to remove from remote wishlist', err);
          // --- ROLLBACK on failure ---
          setProductIds(prev => {
            if (prev.includes(variantId)) return prev;
            return [...prev, variantId];
          });
          toast.error('Failed to remove from wishlist');
        })
        .finally(() => {
          inFlight.current.delete(variantId);
        });
    } else {
      toast.success('Removed from wishlist');
    }
  }, [isAuthenticated]);

  const isInWishlist = useCallback((variantId: string) => {
    return productIds.includes(variantId);
  }, [productIds]);

  const contextValue = useMemo(() => ({
    productIds,
    addToWishlist,
    removeFromWishlist,
    isInWishlist
  }), [productIds, addToWishlist, removeFromWishlist, isInWishlist]);

  return (
    <WishlistContext.Provider value={contextValue}>
      {children}
    </WishlistContext.Provider>
  );
};
