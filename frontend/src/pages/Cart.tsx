import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { formatPrice } from '../utils/formatPrice';
import { getImageUrl } from '../utils/getImageUrl';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getPromoIcon, getPromoHeadline, estimateSavings } from '../utils/promotionHelpers';
import { useInView } from '../hooks/useInView';
import { giftServiceService } from '../services/giftServiceService';
import type { GiftServiceItem } from '../services/giftServiceService';
import { GiftWrappingOptions } from '../components/common/GiftWrappingOptions';

export const Cart: React.FC = () => {
  const { settings } = useStoreSettings();
  const { items, removeItem, updateQuantity, subtotal, offerDiscount, itemCount, appliedPromotions, availablePromotions, lockedPromotions, unlockMessages, cartDiscount, manuallySelectedPromotionId, applyPromotion, removePromotion, removeCoupon, freeProductOptions, addFreeItem, removeFreeItem, applyCoupon, giftServiceId } = useCart();

  // Scroll-reveal refs (called unconditionally, before any early returns)
  const { ref: itemsRef, inView: itemsInView } = useInView<HTMLDivElement>();
  const { ref: summaryRef, inView: summaryInView } = useInView<HTMLDivElement>();
  const [brokenGiftImages, setBrokenGiftImages] = useState<Set<number>>(new Set());
  const [giftServices, setGiftServices] = useState<GiftServiceItem[]>([]);

  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Provide immediate feedback for invalid coupons from backend messages
  useEffect(() => {
    if (unlockMessages && unlockMessages.length > 0) {
      const invalidMsg = unlockMessages.find(msg => msg.toLowerCase().includes('invalid or expired'));
      if (invalidMsg) {
        setCouponError('Invalid coupon code');
      } else {
        setCouponError('');
      }
    } else {
      setCouponError('');
    }
  }, [unlockMessages]);

  const [showAllFreeGifts, setShowAllFreeGifts] = useState(false);

  useEffect(() => {
    fetchGiftServices();
  }, []);

  const fetchGiftServices = async () => {
    try {
      const res = await giftServiceService.getActiveServices();
      setGiftServices(res.data || []);
    } catch (err) {
      console.error("Failed to load gift services", err);
    }
  };

  const handleApplyCoupon = async (code?: string | React.FormEvent) => {
    if (code && typeof code !== 'string' && 'preventDefault' in code) {
      code.preventDefault();
    }
    const codeToApply = typeof code === 'string' ? code : couponInput.trim();
    if (!codeToApply) return;

    setIsApplyingCoupon(true);
    setCouponError('');
    try {
      await applyCoupon(codeToApply);
      if (typeof code !== 'string') {
        // Only clear input if they didn't click on an available offer directly
        // So the input stays there to show what they applied!
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.message || 'Invalid coupon code');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const shippingThreshold = settings?.freeShippingThreshold !== undefined ? settings.freeShippingThreshold : 500;

  const totalAfterOffer = subtotal - offerDiscount;
  const shippingCharge = settings?.shippingCharge !== undefined ? settings.shippingCharge : 50;

  // If Free Shipping is part of applied promotions, cost is 0
  const isFreeShipping = appliedPromotions && appliedPromotions.some((p: any) => p.name.includes('Free Shipping'));
  const shippingCost = isFreeShipping ? 0 : (totalAfterOffer > shippingThreshold ? 0 : shippingCharge);

  const selectedGiftPrice = giftServiceId && giftServices.find(g => g.id === giftServiceId)
    ? (giftServices.find(g => g.id === giftServiceId)?.price || 0)
    : 0;

  const total = totalAfterOffer - cartDiscount + shippingCost + selectedGiftPrice;

  if (items.length === 0) {
    return (
      <main className="flex-grow py-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full text-center">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-accent text-2xl">shopping_bag</span>
          </div>
          <h1 className="font-headline-md text-on-surface mb-4 tracking-widest uppercase">Your Cart is Empty</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 leading-relaxed">
            Looks like you haven't added anything to your cart yet. Explore our luxury fragrance collection.
          </p>
          <Link to="/collection" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  // Build promotion status cards
  const renderOfferPanel = () => {
    if ((!appliedPromotions || appliedPromotions.length === 0) &&
      (!availablePromotions || availablePromotions.length === 0) &&
      (!lockedPromotions || lockedPromotions.length === 0)) {
      return null;
    }

    const bestPromo = availablePromotions && availablePromotions.length > 0 ? availablePromotions.reduce((best: any, promo: any) => {
      return estimateSavings(promo, subtotal) > estimateSavings(best, subtotal) ? promo : best;
    }, availablePromotions[0]) : null;

    const manuallySelectedPromo = (appliedPromotions || []).concat(availablePromotions || []).concat(lockedPromotions || []).find((p: any) => p.id === manuallySelectedPromotionId);
    const isManualPromoApplied = manuallySelectedPromo ? appliedPromotions?.some((ap: any) => ap.id === manuallySelectedPromotionId) : false;
    const isManualPromoInvalid = manuallySelectedPromo && !isManualPromoApplied && manuallySelectedPromotionId !== null;

    return (
      <div className="mt-10 space-y-6">
        {/* Invalid Manual Promo Banner */}
        {isManualPromoInvalid && manuallySelectedPromo && (
          <div className="bg-error-container/20 border border-error/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-label-md text-error flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[18px]">error</span>
                Offer Removed: {getPromoHeadline(manuallySelectedPromo)}
              </p>
              <p className="font-body-sm text-on-surface-variant">
                Your cart no longer meets the requirements for this offer.
              </p>
            </div>
          </div>
        )}

        {/* Applied Offers Section */}
        {appliedPromotions && appliedPromotions.length > 0 && (
          <div>
            <h3 className="font-label-sm uppercase tracking-[0.15em] text-on-surface-variant mb-3">Applied Offer</h3>
            {appliedPromotions.map((promo: any) => {
              const icon = getPromoIcon(promo);
              const isManual = promo.id === manuallySelectedPromotionId;

              return (
                <div key={promo.id} className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/[0.04] to-transparent overflow-hidden mb-3">
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5" aria-hidden="true">{icon}</span>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-label-lg text-primary">{getPromoHeadline(promo)}</h4>
                            <span className="bg-primary/10 text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">check_circle</span>
                              {isManual ? 'Manually Applied' : 'Automatically Applied'}
                            </span>
                          </div>
                          <p className="font-body-sm text-on-surface-variant">
                            {promo.description || 'Discount applied to your cart'}
                          </p>
                        </div>
                      </div>
                      {(!promo.stackable) && (
                        <button
                          onClick={() => {
                            if (promo.code) {
                              removeCoupon();
                            } else {
                              removePromotion();
                            }
                          }}
                          className="text-on-surface-variant hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-1 transition-colors flex items-center gap-1 font-label-sm uppercase tracking-wider text-xs whitespace-nowrap rounded-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Available Offers Section */}
        {availablePromotions && availablePromotions.length > 0 && (
          <div>
            <h3 className="font-label-sm uppercase tracking-[0.15em] text-on-surface-variant mb-3">Available Offers</h3>
            <div className="space-y-4">
              {availablePromotions.map((promo: any) => {
                const unlock = unlockMessages?.find(msg => msg.includes(promo.name));
                const icon = getPromoIcon(promo);
                const isBestValue = bestPromo?.id === promo.id;
                const isEligible = !promo.minCartValue || subtotal >= promo.minCartValue;

                let progressUI = null;
                if (promo.minCartValue && subtotal < promo.minCartValue) {
                  const pct = Math.min((subtotal / promo.minCartValue) * 100, 100);
                  progressUI = (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-label-md text-on-surface-variant tracking-wider uppercase">
                          Spend {formatPrice(promo.minCartValue - subtotal)} more
                        </span>
                        <span className="text-[11px] font-label-md text-primary">{Math.round(pct)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-outline-variant/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary-fixed rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={promo.id} className={`relative rounded-xl border overflow-hidden transition-all duration-300 border-outline-variant/60 bg-surface-container-lowest ${isBestValue ? 'ring-1 ring-primary/30 shadow-sm' : ''}`}>
                    {isBestValue && (
                      <div className="absolute top-0 right-0 bg-primary text-on-primary text-[9px] font-label-md px-2 py-0.5 rounded-bl-lg uppercase tracking-widest">
                        ⭐ Best Value
                      </div>
                    )}
                    <div className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5" aria-hidden="true">{icon}</span>
                        <div className="flex-grow min-w-0">
                          <h4 className="font-label-lg text-on-surface mb-0.5">
                            {getPromoHeadline(promo)}
                          </h4>
                          <p className="font-body-sm text-on-surface-variant">
                            {unlock || promo.description || `Eligible on orders over ₹${promo.minCartValue}`}
                          </p>

                          {progressUI}

                          {promo.code && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Code:</span>
                              <span className="font-mono text-xs font-semibold text-primary bg-primary/[0.04] px-1.5 py-0.5 rounded border border-primary/10">{promo.code}</span>
                            </div>
                          )}

                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => applyPromotion(promo.id)}
                              disabled={!isEligible}
                              className={`px-4 py-1.5 rounded text-xs font-label-md uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${isEligible
                                  ? 'bg-primary text-on-primary hover:bg-surface-tint'
                                  : 'bg-surface-variant text-on-surface-variant opacity-50 cursor-not-allowed'
                                }`}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Locked Offers Section */}
        {lockedPromotions && lockedPromotions.length > 0 && (
          <div>
            <h3 className="font-label-sm uppercase tracking-[0.15em] text-on-surface-variant mb-3 mt-6">Locked Offers</h3>
            <div className="space-y-4">
              {lockedPromotions.map((promo: any) => {
                const unlock = unlockMessages?.find(msg => msg.includes(promo.name)) || 'Conditions not met';
                const icon = getPromoIcon(promo);

                // For BUY X GET Y progress
                let progressUI = null;
                if (promo.minCartValue && subtotal < promo.minCartValue) {
                  // Threshold progress
                  const pct = Math.min((subtotal / promo.minCartValue) * 100, 100);
                  progressUI = (
                    <div className="mt-3 opacity-60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-label-md text-error tracking-wider uppercase">
                          {unlock}
                        </span>
                        <span className="text-[11px] font-label-md text-on-surface-variant">{Math.round(pct)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-outline-variant/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-on-surface-variant/40 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                } else {
                  progressUI = (
                    <div className="mt-3">
                      <span className="text-[11px] font-label-md text-error tracking-wider uppercase">
                        {unlock}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={promo.id} className="relative rounded-xl border overflow-hidden transition-all duration-300 border-outline-variant/30 bg-surface-container-lowest/50 opacity-75">
                    <div className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5" aria-hidden="true">{icon}</span>
                        <div className="flex-grow min-w-0">
                          <h4 className="font-label-lg text-on-surface-variant mb-0.5">
                            {getPromoHeadline(promo)}
                          </h4>
                          <p className="font-body-sm text-on-surface-variant">
                            {promo.description || `Eligible on orders over ₹${promo.minCartValue}`}
                          </p>

                          {progressUI}

                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFreeGiftsPanel = () => {
    if (!freeProductOptions || freeProductOptions.length === 0) return null;

    // All options come from the single highest-priority qualifying FREE_PRODUCT promo (the engine
    // stops at the first match), so looking up the promotion for the first option is sufficient.
    const matchingPromo = (appliedPromotions || []).concat(availablePromotions || [])
      .find((p: any) => p.id === freeProductOptions[0].promotionId);

    return (
      <div className="mt-10 space-y-6">
        <h3 className="font-label-sm uppercase tracking-[0.15em] text-on-surface-variant mb-3 flex items-center gap-2">
          <span className="text-xl">🎁</span> Choose Your Free Gift
        </h3>
        {matchingPromo?.generatedDescription && (
          <p className="text-sm text-on-surface-variant -mt-3">{matchingPromo.generatedDescription}</p>
        )}
        <p className="text-xs text-on-surface-variant">{freeProductOptions.length} eligible {freeProductOptions.length === 1 ? 'product' : 'products'} — pick one</p>
        <div className="rounded-xl border border-outline-variant divide-y divide-outline-variant overflow-hidden bg-surface-container-lowest">
          {(showAllFreeGifts ? freeProductOptions : freeProductOptions.slice(0, 3)).map((option, idx) => {
            const isAdded = items.some(item => item.freePromotionId === option.promotionId && Number(item.variantId) === option.variantId);
            return (
              <button
                key={`${option.promotionId}-${option.variantId}-${idx}`}
                type="button"
                onClick={() => !isAdded && addFreeItem(option.promotionId, option.variantId)}
                disabled={isAdded}
                className={`w-full flex items-center gap-4 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${isAdded ? 'bg-primary/5 cursor-default' : 'hover:bg-surface-container cursor-pointer'}`}
              >
                {/* Selection indicator */}
                <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isAdded ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                  {isAdded && <span className="material-symbols-outlined text-on-primary text-[14px]">check</span>}
                </span>

                <div className="w-14 h-14 bg-surface-container rounded overflow-hidden shrink-0 border border-outline-variant/30">
                  {option.image && !brokenGiftImages.has(option.variantId) ? (
                    <img
                      src={getImageUrl(option.image)}
                      alt={option.productName}
                      className="w-full h-full object-cover"
                      onError={() => setBrokenGiftImages(prev => new Set(prev).add(option.variantId))}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">image</span>
                    </div>
                  )}
                </div>

                <div className="flex-grow min-w-0">
                  <h4 className="font-label-md text-on-surface truncate">{option.productName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge badge-neutral text-[10px]">{option.variant}</span>
                    {option.categoryName && <span className="text-xs text-on-surface-variant">{option.categoryName}</span>}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="font-label-sm text-success uppercase tracking-wide">Free</span>
                  {isAdded && <p className="text-[10px] text-on-surface-variant mt-0.5">In cart</p>}
                </div>
              </button>
            );
          })}
        </div>
        {freeProductOptions.length > 3 && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setShowAllFreeGifts(!showAllFreeGifts)}
              type="button"
              className="text-[10px] text-on-surface font-label-md uppercase tracking-[0.2em] border border-outline-variant hover:bg-surface-container px-8 py-3 transition-colors rounded-md"
            >
              {showAllFreeGifts ? 'Show Less' : `View All ${freeProductOptions.length} Options`}
            </button>
          </div>
        )}
      </div>
    );
  };


  return (
    <main className="flex-grow py-12 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      <div className="mb-12">
        <h1 className="font-display-lg text-display-lg text-on-surface mb-2">Your Cart</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
          {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-16 items-start">
        {/* Cart Items List */}
        <div ref={itemsRef} className={`w-full lg:w-2/3 flex flex-col gap-8 reveal ${itemsInView ? 'in-view' : ''}`}>
          {items.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-outline-variant/50 relative group">
              <div className="w-full sm:w-36 h-36 bg-surface-container-lowest border border-outline-variant flex-shrink-0 overflow-hidden rounded-sm">
                {item.image ? (
                  <>
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name || 'Product'}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.style.display = 'none';
                        const next = e.currentTarget.nextElementSibling;
                        if (next) next.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden w-full h-full flex items-center justify-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-3xl">image</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-3xl">image</span>
                  </div>
                )}
              </div>
              <div className="flex-grow flex flex-col sm:flex-row justify-between w-full">
                <div className="flex flex-col mb-4 sm:mb-0">
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-1">
                    {item.name || 'Product'}
                  </h3>
                  <div className="flex flex-col gap-1 mb-4">
                    <div className="flex items-center gap-2">
                      {item.size && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Size: {item.size}
                        </p>
                      )}
                      {item.freeItem && (
                        <span className="bg-primary/10 text-primary text-[10px] font-label-md px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider border border-primary/20">
                          <span className="material-symbols-outlined text-[12px]">featured_seasonal_and_gifts</span>
                          Free Gift
                        </span>
                      )}
                    </div>
                    {item.bottle && item.bottle.name && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">liquor</span>
                        Bottle: {item.bottle.name}
                        {item.bottle.price > 0 && ` (+${formatPrice(item.bottle.price)})`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center border border-outline w-max rounded-sm">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.freeItem}
                      aria-label="Decrease quantity"
                      className={`px-3 py-1 text-on-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${item.freeItem ? 'opacity-50 cursor-not-allowed' : 'hover:text-accent'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <span className="px-4 font-body-md text-body-md text-on-surface min-w-[2rem] text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.freeItem}
                      aria-label="Increase quantity"
                      className={`px-3 py-1 text-on-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${item.freeItem ? 'opacity-50 cursor-not-allowed' : 'hover:text-accent'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col justify-between items-end sm:items-end">
                  <span className="font-headline-md text-headline-md text-primary">
                    {item.freeItem ? 'FREE' : formatPrice((item.finalPrice || 0) * item.quantity)}
                  </span>

                  {!item.freeItem && item.discountAmount && item.discountAmount > 0 ? (
                    <div className="text-right">
                      <span className="text-sm text-on-surface-variant line-through block mt-1">
                        {formatPrice((item.originalPrice || 0) * item.quantity)}
                      </span>
                      <span className="text-xs text-primary font-medium block">
                        Saved {formatPrice(item.discountAmount * item.quantity)}
                      </span>
                    </div>
                  ) : (
                    !item.freeItem && <p className="text-sm text-on-surface-variant mt-1">{formatPrice(item.originalPrice || 0)} each</p>
                  )}

                  <button
                    onClick={() => item.freeItem ? removeFreeItem(item.id) : removeItem(item.id)}
                    aria-label="Remove item"
                    className="text-on-surface-variant hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-1 transition-colors mt-4 sm:mt-auto flex items-center gap-1 font-label-md text-label-md uppercase tracking-wider rounded-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Free Gifts Panel */}
          {renderFreeGiftsPanel()}

          {/* Gift Services Panel */}
          <div className="mt-8">
            <GiftWrappingOptions />
          </div>

          {/* Premium Offer Panel */}
          {renderOfferPanel()}
        </div>

        {/* Order Summary */}
        <div ref={summaryRef} className={`w-full lg:w-1/3 bg-surface-container-lowest border border-outline-variant p-8 relative overflow-hidden rounded-sm sticky top-24 reveal ${summaryInView ? 'in-view' : ''}`} style={{ boxShadow: '0 10px 30px rgba(31, 41, 55, 0.04)' }}>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-8 border-b border-outline-variant/30 pb-4">Order Summary</h2>
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="font-body-md text-body-md text-on-surface-variant">Subtotal ({itemCount} items)</span>
              <span className="font-body-md text-body-md text-on-surface">{formatPrice(subtotal)}</span>
            </div>
            {(offerDiscount + cartDiscount) > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-body-md text-body-md text-primary">Discount</span>
                <span className="font-body-md text-body-md text-primary">-{formatPrice(offerDiscount + cartDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="font-body-md text-body-md text-on-surface-variant">Shipping</span>
              <span className="font-body-md text-body-md text-on-surface">
                {shippingCost === 0 ? (
                  <span className="text-primary font-medium">Free</span>
                ) : (
                  formatPrice(shippingCost)
                )}
              </span>
            </div>
            {selectedGiftPrice > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-body-md text-body-md text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">redeem</span>
                  Gift Wrapping
                </span>
                <span className="font-body-md text-body-md text-on-surface">{formatPrice(selectedGiftPrice)}</span>
              </div>
            )}
            {shippingCost > 0 && (!unlockMessages || unlockMessages.length === 0) && (
              <p className="text-xs text-on-surface-variant">
                Add {formatPrice(shippingThreshold - (totalAfterOffer - cartDiscount))} more for free shipping
              </p>
            )}

            {/* Unlock messages as premium notification cards */}
            {unlockMessages && unlockMessages.length > 0 && unlockMessages.map((msg, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-primary/[0.05] border border-primary/10 p-3 rounded-lg">
                <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 flex-shrink-0">tips_and_updates</span>
                <p className="text-xs text-primary font-medium leading-relaxed">
                  {msg}
                </p>
              </div>
            ))}
          </div>

          {/* Offers & Coupon Section */}
          <div className="mb-6 pt-6 border-t border-outline-variant/30">
            {appliedPromotions && appliedPromotions.length > 0 && (
              <div className="mb-6">
                {appliedPromotions.map((promo: any) => (
                  <div key={promo.id} className="flex flex-col gap-1">
                    <div className="font-label-md text-sm text-primary font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      Coupon applied: {promo.code || promo.name}
                    </div>
                    <div className="flex justify-between items-center text-sm font-body-md mb-1.5">
                      <span className="text-on-surface-variant">Discount:</span>
                      <span className="font-bold text-primary">-{formatPrice(promo.discountAmount || cartDiscount || offerDiscount)}</span>
                    </div>
                    <div>
                      <button
                        onClick={() => {
                          if (promo.code) removeCoupon();
                          else removePromotion();
                          setCouponInput(''); // clear input when removed
                        }}
                        className="text-[11px] font-label-md uppercase tracking-wider text-error hover:underline"
                      >
                        [ Remove ]
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-6">
              {/* Input Area */}
              <div>
                <p className="font-label-sm text-on-surface-variant mb-2.5 font-medium">Have a coupon code?</p>
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      placeholder="Enter coupon code"
                      className="flex-1 min-w-0 bg-transparent border border-outline-variant rounded-sm px-4 py-2 text-on-surface font-body-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary outline-none uppercase transition-all"
                      aria-label="Coupon code input"
                      disabled={isApplyingCoupon}
                    />
                    <button
                      onClick={() => handleApplyCoupon()}
                      disabled={!!(isApplyingCoupon || !couponInput.trim() || (couponInput.trim() && appliedPromotions?.some((p: any) => p.code && p.code.toLowerCase() === couponInput.trim().toLowerCase())))}
                      className={`shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent px-6 py-2 rounded-sm transition-colors font-label-md tracking-wider uppercase ${
                        !!(!couponInput.trim() || isApplyingCoupon || (couponInput.trim() && appliedPromotions?.some((p: any) => p.code && p.code.toLowerCase() === couponInput.trim().toLowerCase())))
                          ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed'
                          : 'bg-[#d4af37] text-white hover:bg-[#b8860b] cursor-pointer'
                      }`}
                    >
                      {isApplyingCoupon ? '...' : ((couponInput.trim() && appliedPromotions?.some((p: any) => p.code && p.code.toLowerCase() === couponInput.trim().toLowerCase())) ? 'APPLIED' : 'Apply')}
                    </button>
                  </div>
                  {couponError && <p className="text-error text-xs mt-2">{couponError}</p>}
                </div>
              </div>

              {/* Available Offers */}
              {(!availablePromotions || availablePromotions.length === 0) ? (
                <div>
                  <p className="font-label-sm uppercase tracking-[0.15em] text-on-surface-variant/70 mb-2 font-medium">Available Offers</p>
                  <p className="text-sm text-on-surface-variant italic">No offers available for this order</p>
                </div>
              ) : (
                <div>
                  <p className="font-label-sm uppercase tracking-[0.15em] text-on-surface-variant mb-3 font-medium">Available Offers</p>
                  <div className="space-y-3">
                    {availablePromotions.map((promo: any) => (
                      <div key={promo.id} className="bg-surface-container-lowest border border-outline-variant/50 p-4 rounded-sm flex items-start gap-3">
                        <span className="text-xl mt-0.5" aria-hidden="true">{getPromoIcon(promo)}</span>
                        <div className="flex-grow min-w-0">
                          <div className="font-label-md text-sm text-on-surface font-semibold mb-0.5">{promo.code || getPromoHeadline(promo)}</div>
                          <div className="text-xs text-on-surface-variant leading-relaxed">{promo.description || getPromoHeadline(promo)}</div>
                          <div className="mt-2.5">
                            {promo.code ? (
                              <button
                                onClick={() => handleApplyCoupon(promo.code || '')}
                                disabled={isApplyingCoupon}
                                className="text-[11px] font-label-md text-primary hover:underline uppercase tracking-wider font-medium"
                              >
                                Apply
                              </button>
                            ) : (
                              <button
                                onClick={() => applyPromotion(promo.id)}
                                className="text-[11px] font-label-md text-primary hover:underline uppercase tracking-wider font-medium"
                              >
                                Apply
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mb-8 pt-4 border-t border-outline-variant/30">
            <span className="font-headline-md text-headline-md text-on-surface">Total</span>
            <span className="font-headline-md text-headline-md text-primary">{formatPrice(total)}</span>
          </div>

          <Link
            to="/checkout"
            className="w-full bg-primary hover:bg-surface-tint text-on-primary font-label-md text-label-md uppercase tracking-wider py-4 transition-colors duration-300 flex justify-center items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Proceed to Checkout
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
          <p className="font-label-sm text-label-sm text-on-surface-variant/70 text-center mt-4">
            Secure checkout
          </p>
        </div>
      </div>
    </main>
  );
};
