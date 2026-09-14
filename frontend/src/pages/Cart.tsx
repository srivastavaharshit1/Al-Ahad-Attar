import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { formatPrice } from '../utils/formatPrice';
import { getImageUrl } from '../utils/getImageUrl';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useInView } from '../hooks/useInView';

// ─── Stitch Design Token Helpers ────────────────────────────────────────────
const C = {
  bg: '#f9f8f6',           // warm ivory page background
  card: '#ffffff',          // white card surface
  border: '#e8e0d0',        // muted warm border
  navy: '#1c2533',          // deep navy text
  navyLight: '#4a5568',     // secondary text
  gold: '#8b6914',          // antique gold accent
  goldBg: '#fdf8ee',        // gold tinted background
  goldBorder: '#c9a227',    // gold border
  goldDark: '#755811',      // dark gold for CTAs
  success: '#2f7a4a',       // green
  error: '#c0392b',         // error red
  inputBg: '#fbfaf8'        // slightly off-white for inputs
};

export const Cart: React.FC = () => {
  const { settings } = useStoreSettings();
  const { 
    items, removeItem, updateQuantity, subtotal, offerDiscount, itemCount, 
    appliedPromotions, unlockMessages, cartDiscount, 
    removePromotion, removeCoupon, removeFreeItem, applyCoupon, 
    isGiftWrapped, setIsGiftWrapped, giftMessage, setGiftMessage 
  } = useCart();

  const { ref: itemsRef, inView: itemsInView } = useInView<HTMLDivElement>();
  const { ref: summaryRef, inView: summaryInView } = useInView<HTMLDivElement>();
  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

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
      setCouponInput('');
    } catch (err: any) {
      setCouponError(err.response?.data?.message || 'Invalid coupon code');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const shippingThreshold = settings?.freeShippingThreshold !== undefined ? settings.freeShippingThreshold : 500;
  const totalAfterOffer = subtotal - offerDiscount;
  const shippingCharge = settings?.shippingCharge !== undefined ? settings.shippingCharge : 50;

  const isFreeShipping = appliedPromotions && appliedPromotions.some((p: any) => p.name.includes('Free Shipping'));
  const shippingCost = isFreeShipping ? 0 : (totalAfterOffer > shippingThreshold ? 0 : shippingCharge);
  const selectedGiftPrice = (isGiftWrapped && settings?.isGiftWrapEnabled) ? (settings.giftWrapPrice || 0) : 0;
  
  const total = totalAfterOffer - cartDiscount + shippingCost + selectedGiftPrice;

  const packagingUpgradesPrice = items.reduce((sum, item) => sum + ((item.bottle?.price || 0) * item.quantity), 0);
  const itemsSubtotalWithoutPackaging = subtotal - packagingUpgradesPrice;

  // Free Shipping Progress
  const amountToFreeShipping = Math.max(0, shippingThreshold - totalAfterOffer);
  const freeShippingProgress = Math.min(100, (totalAfterOffer / shippingThreshold) * 100);

  // ─── Empty State ────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4" style={{ backgroundColor: C.bg }}>
        <div className="max-w-md w-full flex flex-col items-center text-center p-8 bg-white rounded-md border shadow-sm" style={{ borderColor: C.border }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: C.goldBg, border: `1px solid ${C.goldBorder}` }}>
            <span className="material-symbols-outlined text-[28px]" style={{ color: C.goldDark }}>shopping_bag</span>
          </div>
          <h1 className="text-2xl font-serif mb-3" style={{ color: C.navy }}>Your Cart is Empty</h1>
          <p className="text-[13px] mb-8" style={{ color: C.navyLight }}>
            Looks like you haven't added anything to your cart yet. Explore our luxury fragrance collection.
          </p>
          <Link 
            to="/collection" 
            className="w-full py-4 rounded text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:brightness-110 shadow-sm"
            style={{ backgroundColor: C.goldDark }}
          >
            CONTINUE SHOPPING
          </Link>
        </div>
      </div>
    );
  }

  // ─── Render Cart ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-16 md:pb-24" style={{ backgroundColor: C.bg }}>
      
      {/* ── Header ── */}
      <div className="px-4 md:px-8 py-6 md:py-10 bg-white border-b mb-6 md:mb-10" style={{ borderColor: C.border }}>
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: C.goldDark }}>YOUR BAG</div>
            <h1 className="text-3xl md:text-4xl font-serif" style={{ color: C.navy }}>Shopping Cart</h1>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-4 md:pt-0" style={{ borderColor: C.border }}>
             <Link to="/collection" className="text-[10px] font-bold uppercase tracking-widest hover:underline" style={{ color: C.navyLight }}>CONTINUE SHOPPING</Link>
             <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded" style={{ backgroundColor: C.inputBg, color: C.navy, border: `1px solid ${C.border}` }}>
               {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'}
             </span>
          </div>
        </div>
      </div>

      <main className="max-w-[1200px] mx-auto px-4 md:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* ─── LEFT: Cart Items ─── */}
          <div ref={itemsRef} className={`lg:col-span-7 flex flex-col gap-6 reveal ${itemsInView ? 'in-view' : ''}`}>
            {items.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-md border flex flex-col sm:flex-row gap-5" style={{ borderColor: C.border }}>
                {/* Image */}
                <div className="w-full sm:w-32 h-32 rounded-md overflow-hidden shrink-0 border" style={{ borderColor: C.border }}>
                  {item.image ? (
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: C.bg }}>
                      <span className="material-symbols-outlined text-2xl" style={{ color: C.navyLight }}>image</span>
                    </div>
                  )}
                </div>
                
                {/* Details */}
                <div className="flex-grow flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="text-xl font-serif mb-1" style={{ color: C.navy }}>
                        {item.name}
                      </h3>
                      <div className="text-[11px] mb-2" style={{ color: C.navyLight }}>
                        <span className="font-semibold" style={{ color: C.navy }}>{item.size}</span> • Concentrated Perfume Oil
                      </div>
                      
                      {item.bottle && item.bottle.name && (
                        <div className="text-[11px] mb-1" style={{ color: C.navyLight }}>
                          Packaging: {item.bottle.name} {item.bottle.price > 0 ? `(+${formatPrice(item.bottle.price)})` : ''}
                        </div>
                      )}
                      {item.freeItem && (
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded inline-block mt-1" style={{ backgroundColor: C.goldBg, color: C.goldDark, border: `1px solid ${C.goldBorder}` }}>
                          FREE GIFT
                        </span>
                      )}
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="text-lg font-serif block" style={{ color: C.navy }}>
                        {item.freeItem ? 'FREE' : formatPrice((item.finalPrice || 0) * item.quantity)}
                      </span>
                      {!item.freeItem && item.discountAmount && item.discountAmount > 0 && (
                        <span className="text-[10px] line-through block mt-1" style={{ color: C.navyLight }}>
                          {formatPrice((item.originalPrice || 0) * item.quantity)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex justify-between items-center mt-6">
                    <div className="flex items-center border rounded h-8 overflow-hidden" style={{ borderColor: C.border, backgroundColor: C.inputBg }}>
                      <button
                        onClick={() => updateQuantity(item.id, -1, true)}
                        disabled={item.freeItem}
                        className="w-8 h-full flex items-center justify-center transition-colors hover:bg-gray-50 disabled:opacity-50"
                        style={{ color: C.navy }}
                      >
                        <span className="material-symbols-outlined text-[14px]">remove</span>
                      </button>
                      <span className="w-10 text-center text-[12px] font-semibold border-x flex items-center justify-center h-full bg-white" style={{ borderColor: C.border, color: C.navy }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1, true)}
                        disabled={item.freeItem}
                        className="w-8 h-full flex items-center justify-center transition-colors hover:bg-gray-50 disabled:opacity-50"
                        style={{ color: C.navy }}
                      >
                         <span className="material-symbols-outlined text-[14px]">add</span>
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => item.freeItem ? removeFreeItem(item.id) : removeItem(item.id)} 
                      className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:underline"
                      style={{ color: C.navyLight }}
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      REMOVE
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Gift Box Section */}
            {settings?.isGiftWrapEnabled && (
              <div className="bg-white border p-5 rounded-md flex items-start gap-4 mt-2" style={{ borderColor: C.border }}>
                <div className="mt-0.5">
                  <div 
                    className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors border cursor-pointer"
                    style={{ borderColor: isGiftWrapped ? C.goldDark : C.border, backgroundColor: isGiftWrapped ? C.goldDark : C.inputBg }}
                    onClick={() => setIsGiftWrapped(!isGiftWrapped)}
                  >
                    {isGiftWrapped && <span className="material-symbols-outlined text-[14px] text-white">check</span>}
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="text-[13px] font-bold tracking-wide uppercase mb-1 cursor-pointer" style={{ color: C.navy }} onClick={() => setIsGiftWrapped(!isGiftWrapped)}>
                    Pack this order as a gift
                  </div>
                  <p className="text-[11px]" style={{ color: C.navyLight }}>
                    Add signature artisanal wrapping (+{formatPrice(settings.giftWrapPrice || 0)})
                  </p>
                  
                  {isGiftWrapped && (
                    <div className="mt-4">
                      <textarea
                        value={giftMessage || ''}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        placeholder="Write a message to include with your gift (Optional)"
                        className="w-full rounded border p-3 text-[12px] outline-none min-h-[80px] resize-y focus:ring-1"
                        style={{ backgroundColor: C.inputBg, borderColor: C.border, color: C.navy, outlineColor: C.goldDark }}
                      ></textarea>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Promotions / Coupons */}
            <div className="bg-white border p-5 rounded-md mt-2" style={{ borderColor: C.border }}>
               <h3 className="text-[13px] font-bold tracking-wide uppercase mb-4" style={{ color: C.navy }}>Promotions & Offers</h3>
               
               {appliedPromotions && appliedPromotions.length > 0 && (
                 <div className="mb-4 space-y-2">
                   {appliedPromotions.map((promo: any) => (
                     <div key={promo.id} className="flex items-center justify-between p-3 rounded border" style={{ backgroundColor: C.goldBg, borderColor: C.goldBorder }}>
                       <div className="flex items-center gap-2">
                         <span className="material-symbols-outlined text-[16px]" style={{ color: C.goldDark }}>check_circle</span>
                         <span className="text-[11px] font-semibold" style={{ color: C.goldDark }}>{promo.code || promo.name} applied</span>
                       </div>
                       <button 
                          onClick={() => promo.code ? removeCoupon() : removePromotion()}
                          className="text-[10px] font-bold uppercase tracking-wider hover:underline"
                          style={{ color: C.goldDark }}
                       >
                         REMOVE
                       </button>
                     </div>
                   ))}
                 </div>
               )}
               
               <div className="flex rounded overflow-hidden">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    placeholder="ENTER DISCOUNT CODE"
                    className="flex-grow border-y border-l px-4 py-3 text-[11px] font-semibold tracking-wider uppercase outline-none"
                    style={{ backgroundColor: C.inputBg, borderColor: C.border, color: C.navy }}
                    disabled={isApplyingCoupon}
                  />
                  <button
                    onClick={() => handleApplyCoupon()}
                    disabled={!couponInput.trim() || isApplyingCoupon}
                    className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: C.navy }}
                  >
                    {isApplyingCoupon ? '...' : 'APPLY'}
                  </button>
               </div>
               {couponError && <p className="text-[11px] mt-2" style={{ color: C.error }}>{couponError}</p>}
               {unlockMessages && unlockMessages.length > 0 && (
                 <div className="mt-3 space-y-2">
                   {unlockMessages.map((msg, i) => (
                     <div key={i} className="text-[10px] font-bold uppercase tracking-widest p-3 rounded border" style={{ backgroundColor: C.goldBg, color: C.goldDark, borderColor: C.goldBorder }}>
                       {msg}
                     </div>
                   ))}
                 </div>
               )}
            </div>
            
          </div>

          {/* ─── RIGHT: Sticky Order Summary ─── */}
          <div ref={summaryRef} className={`lg:col-span-5 reveal ${summaryInView ? 'in-view' : ''}`}>
            <div className="sticky top-24 bg-white border rounded-md shadow-sm" style={{ borderColor: C.border, borderTop: `4px solid ${C.goldDark}` }}>
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: C.border }}>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: C.goldDark }}>REVIEW ORDER</div>
                    <span className="text-2xl font-serif" style={{ color: C.navy }}>Order Summary</span>
                  </div>
                </div>
                
                {/* Free Shipping Progress inside Summary */}
                <div className="mb-6">
                  {!isFreeShipping && shippingCost > 0 ? (
                    <>
                      <div className="flex justify-between items-center mb-2 text-[10px] uppercase font-bold tracking-wider">
                        <span className="flex items-center gap-1.5" style={{ color: C.goldDark }}>
                          <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                          FREE SHIPPING ELIGIBILITY
                        </span>
                        <span style={{ color: C.navy }}>{Math.round(freeShippingProgress)}%</span>
                      </div>
                      <div className="w-full h-1 rounded-full mb-2" style={{ backgroundColor: `${C.border}` }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${freeShippingProgress}%`, backgroundColor: C.gold }}
                        />
                      </div>
                      <p className="text-[11px]" style={{ color: C.navyLight }}>
                        Add {formatPrice(amountToFreeShipping)} more to unlock Free Shipping
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider py-2" style={{ color: C.success }}>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Free shipping unlocked!
                    </div>
                  )}
                </div>

                <div className="w-full h-px mb-6" style={{ backgroundColor: C.border }}></div>
                
                <div className="space-y-3 text-[12px] mb-6">
                  <div className="flex justify-between">
                    <span style={{ color: C.navyLight }}>Subtotal</span>
                    <span style={{ color: C.navy }}>{formatPrice(itemsSubtotalWithoutPackaging)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: C.navyLight }}>Packaging Upgrades</span>
                    <span className="uppercase" style={{ color: C.goldDark }}>{packagingUpgradesPrice > 0 ? formatPrice(packagingUpgradesPrice) : 'STANDARD (FREE)'}</span>
                  </div>
                  {isGiftWrapped && settings?.isGiftWrapEnabled && (
                    <div className="flex justify-between">
                      <span style={{ color: C.navyLight }}>Gift Wrapping</span>
                      <span style={{ color: C.navy }}>{formatPrice(selectedGiftPrice)}</span>
                    </div>
                  )}
                  {(offerDiscount + cartDiscount) > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: C.goldDark }}>Discount</span>
                      <span style={{ color: C.goldDark }}>-{formatPrice(offerDiscount + cartDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span style={{ color: C.navyLight }}>Standard Shipping</span>
                    <span style={{ color: shippingCost === 0 ? C.success : C.navy, fontWeight: shippingCost === 0 ? 600 : 400 }}>
                      {shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
                    </span>
                  </div>
                </div>
                
                <div className="w-full h-px mb-6" style={{ backgroundColor: C.border }}></div>
                
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <span className="block text-base font-serif" style={{ color: C.navy }}>Total</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: C.navyLight }}>INCLUDES ALL TAXES</span>
                  </div>
                  <span className="text-3xl font-serif" style={{ color: C.navy }}>{formatPrice(total)}</span>
                </div>
                
                <Link
                  to="/checkout"
                  className="w-full py-4 rounded-lg flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:brightness-110 shadow-sm"
                  style={{ background: `linear-gradient(to right, ${C.gold}, ${C.goldDark})` }}
                >
                  <span className="material-symbols-outlined text-[16px]">shopping_cart_checkout</span>
                  PROCEED TO CHECKOUT
                </Link>
                
                <div className="mt-6 flex justify-center gap-6">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: C.navyLight }}>lock</span>
                  <span className="material-symbols-outlined text-[20px]" style={{ color: C.navyLight }}>local_shipping</span>
                  <span className="material-symbols-outlined text-[20px]" style={{ color: C.navyLight }}>verified</span>
                </div>
                <div className="mt-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed" style={{ color: C.navyLight }}>
                    SECURE CHECKOUT PROCESS<br/>
                    100% AUTHENTIC ARTISANAL BLENDS
                  </p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
};
