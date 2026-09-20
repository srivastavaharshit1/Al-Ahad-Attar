import React, { createContext, useState, useEffect, useContext, useRef, type ReactNode } from 'react';
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
  const [productIds, setProductIds] = useState<string[]>([]);
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated;

  // Track in-flight mutations per variantId to prevent rapid-click race conditions.
  // Using a ref (not state) so mutations don't trigger re-renders.
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch wishlist from backend
      wishlistService.getWishlist().then(res => {
        if (res.data) {
          const dbIds = res.data.map(item => item.variant.id.toString());
          // Sync local items that aren't in DB
          const localOnly = productIds.filter(id => !dbIds.includes(id));
          localOnly.forEach(id => wishlistService.addToWishlist(Number(id)).catch(console.error));
          setProductIds(Array.from(new Set([...dbIds, ...productIds])));
        }
      }).catch(console.error);
    } else {
      const stored = storage.get<string[]>('wishlist', []);
      setProductIds(stored);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      storage.set('wishlist', productIds);
    }
  }, [productIds, isAuthenticated]);

  const addToWishlist = (variantId: string) => {
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
  };

  const removeFromWishlist = (variantId: string) => {
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
  };

  const isInWishlist = (variantId: string) => productIds.includes(variantId);

  return (
    <WishlistContext.Provider value={{ productIds, addToWishlist, removeFromWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};
