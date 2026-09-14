import React, { createContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { CartItem } from '../types';
import { storage } from '../utils/storage';
import { useAuth } from '../hooks/useAuth';
import { cartService } from '../services/cartService';
import toast from 'react-hot-toast';

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, deltaOrQuantity: number, isDelta?: boolean) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  offerDiscount: number;
  couponCode: string | null;
  discount: number; // coupon discount
  cartDiscount: number;
  appliedPromotions: any[];
  availablePromotions: any[];
  lockedPromotions: any[];
  unlockMessages: string[];
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  manuallySelectedPromotionId: number | null;
  applyPromotion: (promotionId: number) => Promise<void>;
  removePromotion: () => Promise<void>;
  freeProductOptions: any[];
  addFreeItem: (promotionId: number, variantId: number) => Promise<void>;
  removeFreeItem: (cartItemId: string) => Promise<void>;
  isGiftWrapped: boolean;
  setIsGiftWrapped: (isWrapped: boolean) => void;
  giftMessage: string | null;
  setGiftMessage: (msg: string | null) => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    // Synchronous initial load to prevent localStorage overwrite race condition
    const token = storage.get('token', null);
    if (!token) {
      return storage.get<CartItem[]>('cart', []);
    }
    return [];
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(() => storage.get('cart_coupon', null));
  const [discount] = useState<number>(() => storage.get('cart_discount', 0));
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [appliedPromotions, setAppliedPromotions] = useState<any[]>([]);
  const [availablePromotions, setAvailablePromotions] = useState<any[]>([]);
  const [lockedPromotions, setLockedPromotions] = useState<any[]>([]);
  const [unlockMessages, setUnlockMessages] = useState<string[]>([]);
  const [manuallySelectedPromotionId, setManuallySelectedPromotionId] = useState<number | null>(() => storage.get('cart_manual_promo', null));
  const [freeProductOptions, setFreeProductOptions] = useState<any[]>([]);
  const [isGiftWrapped, setIsGiftWrappedState] = useState<boolean>(() => storage.get('cart_is_gift_wrapped', false));
  const [giftMessage, setGiftMessageState] = useState<string | null>(() => storage.get('cart_gift_message', null));
  const { isAuthenticated, user } = useAuth();
  const quantityUpdateTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const quantityUpdateTokens = useRef<Map<string, symbol>>(new Map());
  const pendingQuantities = useRef<Map<string, number>>(new Map());
  const pendingRemovals = useRef<Set<string>>(new Set());

  const setIsGiftWrapped = (isWrapped: boolean) => {
    setIsGiftWrappedState(isWrapped);
    storage.set('cart_is_gift_wrapped', isWrapped);
  };

  const setGiftMessage = (msg: string | null) => {
    setGiftMessageState(msg);
    storage.set('cart_gift_message', msg);
  };

  const syncCartState = (cartData: any) => {
    if (!cartData) return;
    
    setItems(prevItems => {
      const mappedItems: CartItem[] = (cartData.items || [])
        .filter((i: any) => {
          const existing = prevItems.find(p => 
            p.productId.toString() === i.productId.toString() && 
            p.variantId?.toString() === i.variantId?.toString() &&
            p.bottle?.id === i.bottle?.id
          );
          const id = i.id ? i.id.toString() : (existing ? existing.id : null);
          return id ? !pendingRemovals.current.has(id) : true;
        })
        .map((i: any) => {
        // Try to preserve existing local IDs for guest carts to prevent UI flicker/re-renders
        const existing = prevItems.find(p => 
          p.productId.toString() === i.productId.toString() && 
          p.variantId?.toString() === i.variantId?.toString() &&
          p.bottle?.id === i.bottle?.id
        );
        const id = i.id ? i.id.toString() : (existing ? existing.id : Math.random().toString(36).substring(7));
        
        const optimisticQty = pendingQuantities.current.get(id);
        const finalQuantity = optimisticQty !== undefined ? optimisticQty : i.quantity;
        
        return {
          id,
          productId: i.productId.toString(),
          variantId: i.variantId.toString(),
          name: i.name,
          image: i.image,
          size: i.size,
          quantity: finalQuantity,
          price: Number(i.finalPrice || i.price),
          originalPrice: Number(i.originalPrice || i.price),
          discountAmount: Number(i.discountAmount || 0),
          finalPrice: Number(i.finalPrice || i.price),
          freeItem: i.freeItem,
          freePromotionId: i.freePromotionId,
          bottle: i.bottle
        };
      });
      return mappedItems;
    });

    setCartDiscount(Number(cartData.cartDiscount || 0));
    setAppliedPromotions(cartData.appliedPromotions || []);
    setAvailablePromotions(cartData.availablePromotions || []);
    setLockedPromotions(cartData.lockedPromotions || []);
    setUnlockMessages(cartData.unlockMessages || []);
    setFreeProductOptions(cartData.freeProductOptions || []);
    
    if (cartData.couponCode !== undefined) {
      setCouponCode(cartData.couponCode);
    }
    
    if (cartData.manuallySelectedPromotionId !== undefined) {
      setManuallySelectedPromotionId(cartData.manuallySelectedPromotionId === -1 ? null : cartData.manuallySelectedPromotionId);
    }
  };

  // Load cart data
  useEffect(() => {
    const loadCart = async () => {
      if (isAuthenticated) {
        try {
          // Merge any items added while browsing as a guest into the server-side
          // cart before loading it, otherwise they'd be silently lost on login.
          const guestItems = storage.get<CartItem[]>('cart', []);
          if (guestItems.length > 0) {
            for (const guestItem of guestItems) {
              if (guestItem.variantId) {
                try {
                  await cartService.addToCart(Number(guestItem.variantId), guestItem.quantity);
                } catch (mergeError) {
                  console.error("Failed to merge guest cart item into account cart", guestItem, mergeError);
                }
              }
            }
            storage.remove('cart');
          }

          const response = await cartService.getCart();
          if (response) {
            syncCartState(response.data);
          }
        } catch (error) {
          console.error("Failed to fetch cart from server", error);
        }
      }
      setIsLoaded(true);
    };

    if (isAuthenticated) {
      loadCart();
    } else {
      setIsLoaded(true);
    }
  }, [isAuthenticated, user]);

  // Save to local storage on change (only if not authenticated)
  useEffect(() => {
    if (!isAuthenticated && isLoaded) {
      storage.set('cart', items);
    }
  }, [items, isAuthenticated, isLoaded]);

  useEffect(() => {
    storage.set('cart_coupon', couponCode);
    storage.set('cart_discount', discount);
    storage.set('cart_manual_promo', manuallySelectedPromotionId);
  }, [couponCode, discount, manuallySelectedPromotionId]);

  // Guest cart evaluation
  useEffect(() => {
    if (isAuthenticated || !isLoaded) return;
    
    const abortController = new AbortController();
    
    const evaluate = async () => {
      try {
        const payload = {
          items: items.map(i => ({
            productId: Number(i.productId),
            variantId: Number(i.variantId),
            quantity: i.quantity,
            freeItem: i.freeItem,
            freePromotionId: i.freePromotionId,
            bottleId: i.bottle?.id ? Number(i.bottle.id) : undefined
          })),
          couponCode,
          manuallySelectedPromotionId
        };
        const res = await cartService.evaluateGuestCart(payload);
        if (res && !abortController.signal.aborted) {
          pendingQuantities.current.clear();
          pendingRemovals.current.clear();
          syncCartState(res.data);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("Guest cart evaluation failed", err);
        }
      }
    };

    const timeoutId = setTimeout(evaluate, 500); // debounce
    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    isLoaded,
    couponCode,
    manuallySelectedPromotionId,
    // JSON.stringify to avoid infinite loops when syncCartState replaces the items array reference
    JSON.stringify(items.map(i => ({ p: i.productId, v: i.variantId, q: i.quantity, f: i.freeItem, prm: i.freePromotionId, b: i.bottle?.id })))
  ]);

  const addItem = async (item: CartItem) => {
    if (isAuthenticated && item.variantId) {
      try {
        const bottleId = item.bottle?.id;
        const response = await cartService.addToCart(Number(item.variantId), item.quantity, bottleId);
        if (response) {
            syncCartState(response.data);
            toast.success(`${item.name} added to cart`);
        }
      } catch (error) {
        console.error("Failed to add item to remote cart", error);
        toast.error("Failed to add item to cart");
      }
    } else {
      setItems(prev => {
        const existingItem = prev.find(i => 
          i.productId === item.productId && 
          i.variantId === item.variantId &&
          i.bottle?.id === item.bottle?.id
        );
        if (existingItem) {
          return prev.map(i => 
            i.id === existingItem.id ? { ...i, quantity: i.quantity + item.quantity } : i
          );
        }
        return [...prev, { ...item, id: Math.random().toString(36).substring(2, 9) }];
      });
      toast.success(`${item.name} added to cart`);
    }
  };

  const removeItem = async (id: string) => {
    pendingRemovals.current.add(id);
    pendingQuantities.current.delete(id);
    
    setItems(prev => prev.filter(item => item.id !== id));
    
    if (isAuthenticated) {
      try {
        await cartService.removeFromCart(Number(id));
        // Re-fetch full cart to re-evaluate promotions
        const response = await cartService.getCart();
        if (response) {
          pendingRemovals.current.delete(id);
          syncCartState(response.data);
        }
        toast.success("Item removed from cart");
      } catch (error) {
        console.error("Failed to remove item from remote cart", error);
        toast.error("Failed to remove item");
        const response = await cartService.getCart();
        if (response) {
          pendingRemovals.current.delete(id);
          syncCartState(response.data);
        }
      }
    } else {
      toast.success("Item removed from cart");
    }
  };


  const updateQuantity = (id: string, deltaOrQuantity: number, isDelta: boolean = false) => {
    const baseQuantity = pendingQuantities.current.has(id) 
      ? pendingQuantities.current.get(id)! 
      : (items.find(i => i.id === id)?.quantity || 0);

    const nextQuantity = isDelta ? baseQuantity + deltaOrQuantity : deltaOrQuantity;

    if (nextQuantity <= 0) {
      removeItem(id);
      return;
    }

    pendingQuantities.current.set(id, nextQuantity);

    // Update the visible quantity immediately
    setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: nextQuantity } : item));

    if (!isAuthenticated) return;

    const token = Symbol();
    quantityUpdateTokens.current.set(id, token);

    const existingTimer = quantityUpdateTimers.current.get(id);
    if (existingTimer) clearTimeout(existingTimer);

    quantityUpdateTimers.current.set(id, setTimeout(async () => {
      quantityUpdateTimers.current.delete(id);
      try {
        const response = await cartService.updateQuantity(Number(id), nextQuantity);
        if (response && quantityUpdateTokens.current.get(id) === token) {
          pendingQuantities.current.delete(id);
          syncCartState(response.data);
        }
      } catch (error) {
        console.error("Failed to update remote cart quantity", error);
        toast.error("Failed to update quantity");
        if (quantityUpdateTokens.current.get(id) === token) {
          pendingQuantities.current.delete(id);
          setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: baseQuantity } : item));
        }
      }
    }, 400));
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await cartService.clearCart();
        setItems([]);
      } catch (error) {
        console.error("Failed to clear remote cart", error);
      }
    } else {
      setItems([]);
    }
    removeCoupon();
    removePromotion();
  };
  
  const applyCoupon = async (code: string) => {
    if (isAuthenticated) {
      try {
        const response = await cartService.applyCoupon(code);
        if (response) {
            syncCartState(response.data);
            toast.success("Coupon applied");
        }
      } catch (error: any) {
        console.error("Failed to apply coupon", error);
        toast.error(error.response?.data?.message || "Failed to apply coupon");
        throw error;
      }
    } else {
      setCouponCode(code);
    }
  };
  
  const removeCoupon = async () => {
    if (isAuthenticated) {
      try {
        const response = await cartService.removeCoupon();
        if (response) {
            syncCartState(response.data);
            toast.success("Coupon removed");
        }
      } catch (error) {
        console.error("Failed to remove coupon", error);
        toast.error("Failed to remove coupon");
      }
    } else {
      setCouponCode(null);
    }
  };

  const applyPromotion = async (promotionId: number) => {
    if (isAuthenticated) {
      try {
        const response = await cartService.applyPromotion(promotionId);
        if (response) {
            syncCartState(response.data);
            toast.success("Offer applied");
        }
      } catch (error: any) {
        console.error("Failed to apply promotion", error);
        toast.error(error.response?.data?.message || "Failed to apply promotion");
      }
    } else {
      setManuallySelectedPromotionId(promotionId);
    }
  };

  const removePromotion = async () => {
    if (isAuthenticated) {
      try {
        const response = await cartService.removePromotion();
        if (response) {
            syncCartState(response.data);
            toast.success("Offer removed");
        }
      } catch (error) {
        console.error("Failed to remove promotion", error);
        toast.error("Failed to remove promotion");
      }
    } else {
      setManuallySelectedPromotionId(null);
    }
  };

  const addFreeItem = async (promotionId: number, variantId: number) => {
    if (isAuthenticated) {
      try {
        const response = await cartService.addFreeProduct(promotionId, variantId);
        if (response) {
          syncCartState(response.data);
          toast.success("Free gift added to cart");
        }
      } catch (error: any) {
        console.error("Failed to add free item", error);
        toast.error(error.response?.data?.message || "Failed to add free item");
      }
    } else {
      toast.error("Please login to claim free gifts");
    }
  };

  const removeFreeItem = async (cartItemId: string) => {
    if (isAuthenticated) {
      try {
        const response = await cartService.removeFreeProduct(Number(cartItemId));
        if (response) {
          syncCartState(response.data);
          toast.success("Free gift removed");
        }
      } catch (error: any) {
        console.error("Failed to remove free item", error);
        toast.error(error.response?.data?.message || "Failed to remove free item");
      }
    } else {
      // Local removal (should not occur since we require auth for free items)
      setItems(prev => prev.filter(item => item.id !== cartItemId));
      toast.success("Free gift removed");
    }
  };

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + ((item.originalPrice || 0) * item.quantity), 0);
  const offerDiscount = items.reduce((acc, item) => acc + ((item.discountAmount || 0) * item.quantity), 0);
  const totalAfterOffer = subtotal - offerDiscount;
  
  const effectiveDiscount = Math.min(discount, totalAfterOffer);

  return (
    <CartContext.Provider value={{ 
      items, addItem, removeItem, updateQuantity, clearCart, 
      itemCount, subtotal, offerDiscount, couponCode, discount: effectiveDiscount,
      cartDiscount, appliedPromotions, availablePromotions, lockedPromotions, unlockMessages,
      applyCoupon, removeCoupon, manuallySelectedPromotionId, applyPromotion, removePromotion,
      freeProductOptions, addFreeItem, removeFreeItem, isGiftWrapped, setIsGiftWrapped, giftMessage, setGiftMessage
    }}>
      {children}
    </CartContext.Provider>
  );
};
