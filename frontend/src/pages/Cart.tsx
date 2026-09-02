import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { formatPrice } from '../utils/formatPrice';
import { getImageUrl } from '../utils/getImageUrl';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useInView } from '../hooks/useInView';

export const Cart: React.FC = () => {
  const { settings } = useStoreSettings();
  const { items, removeItem, updateQuantity, subtotal, offerDiscount, itemCount, appliedPromotions, availablePromotions, unlockMessages, cartDiscount, removePromotion, removeCoupon, removeFreeItem, applyCoupon, isGiftWrapped, setIsGiftWrapped, giftMessage, setGiftMessage } = useCart();

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

  // Calculate packaging upgrades
  const packagingUpgradesPrice = items.reduce((sum, item) => sum + ((item.bottle?.price || 0) * item.quantity), 0);
  const itemsSubtotalWithoutPackaging = subtotal - packagingUpgradesPrice;

  if (items.length === 0) {
    return (
      <div className="bg-[#f9f8f6] min-h-screen">
        <main className="flex-grow py-24 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full text-center">
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-16 h-16 border border-[#d4af37] rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[#d4af37] text-2xl">shopping_bag</span>
            </div>
            <h1 className="font-headline-md text-on-surface mb-4 tracking-widest uppercase">Your Cart is Empty</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 leading-relaxed">
              Looks like you haven't added anything to your cart yet. Explore our luxury fragrance collection.
            </p>
            <Link to="/collection" className="bg-[#2a2321] hover:bg-[#1f1a18] text-white px-8 py-3 uppercase tracking-wider font-label-md text-xs transition-colors">
              Continue Shopping
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-[#f9f8f6] min-h-screen pt-12 pb-24">
      <main className="max-w-container-max mx-auto px-4 md:px-12 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#e4dcc8] pb-6 mb-12 gap-4">
          <h1 className="font-headline-lg text-4xl text-on-surface">Shopping Cart</h1>
          <div className="text-center font-body-sm text-on-surface-variant flex-1 hidden md:block pb-1">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </div>
          <div className="font-label-md text-[11px] text-[#a68a56] uppercase tracking-[0.15em] text-right pb-1">
            {shippingCost === 0 
              ? 'FREE SHIPPING ON YOUR ORDER' 
              : `ADD ${formatPrice(shippingThreshold - (totalAfterOffer - cartDiscount))} MORE FOR FREE SHIPPING`}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Cart Items List */}
          <div ref={itemsRef} className={`w-full lg:w-[62%] flex flex-col gap-6 reveal ${itemsInView ? 'in-view' : ''}`}>
            {items.map((item) => (
              <div key={item.id} className="bg-white p-6 border border-[#eae5dc] flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-full sm:w-36 h-36 bg-[#f5f5f5] flex-shrink-0 flex items-center justify-center p-3 border border-[#eae5dc]/50">
                  {item.image ? (
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name || 'Product'}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.style.display = 'none';
                        const next = e.currentTarget.nextElementSibling;
                        if (next) next.classList.remove('hidden');
                      }}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant">image</span>
                  )}
                  <div className="hidden w-full h-full flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-3xl">image</span>
                  </div>
                </div>
                
                <div className="flex-grow w-full flex flex-col justify-between h-full min-h-[144px]">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-headline-md text-2xl text-on-surface mb-2">
                        {item.name || 'Product'}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4a7c36]"></div>
                        <span className="text-xs text-on-surface-variant">In Stock</span>
                      </div>
                      <div className="space-y-1">
                        {item.size && (
                          <p className="text-sm text-on-surface-variant">
                            <span className="text-on-surface font-medium">Size:</span> {item.size}
                          </p>
                        )}
                        {item.bottle && item.bottle.name && (
                          <p className="text-sm text-on-surface-variant">
                            <span className="text-on-surface font-medium">Packaging:</span> {item.bottle.name} {item.bottle.price > 0 ? `(+${formatPrice(item.bottle.price)})` : ''}
                          </p>
                        )}
                        {item.freeItem && (
                          <span className="bg-[#a68a56]/10 text-[#a68a56] text-[10px] font-label-md px-2 py-0.5 rounded-full inline-block mt-1 uppercase tracking-wider">
                            Free Gift
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="font-headline-md text-2xl text-on-surface block">
                        {item.freeItem ? 'FREE' : formatPrice((item.finalPrice || 0) * item.quantity)}
                      </span>
                      {!item.freeItem && item.discountAmount && item.discountAmount > 0 ? (
                        <div className="mt-1">
                          <span className="text-xs text-on-surface-variant line-through block">
                            Base: {formatPrice((item.originalPrice || 0) * item.quantity)}
                          </span>
                        </div>
                      ) : (
                        !item.freeItem && (
                           <span className="text-xs text-on-surface-variant block mt-1">
                             {item.originalPrice !== item.finalPrice ? `Base: ${formatPrice((item.originalPrice || 0) * item.quantity)}` : ''}
                           </span>
                        )
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mt-6">
                    <div className="flex items-center border border-[#eae5dc] w-max bg-white rounded-sm h-8">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.freeItem}
                        className={`px-3 h-full flex items-center justify-center text-on-surface transition-colors ${item.freeItem ? 'opacity-50 cursor-not-allowed' : 'hover:text-[#a68a56]'}`}
                      >
                        <span className="material-symbols-outlined text-[16px] leading-none select-none">&#xe15b;</span> {/* remove icon */}
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.freeItem}
                        className={`px-3 h-full flex items-center justify-center text-on-surface transition-colors border-l border-[#eae5dc] ${item.freeItem ? 'opacity-50 cursor-not-allowed' : 'hover:text-[#a68a56]'}`}
                      >
                         <span className="material-symbols-outlined text-[16px] leading-none select-none">&#xe145;</span> {/* add icon */}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[11px] font-label-md text-on-surface-variant uppercase tracking-wider">
                      <button 
                        onClick={() => item.freeItem ? removeFreeItem(item.id) : removeItem(item.id)} 
                        className="hover:text-[#93000a] transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Gift Box Section */}
            {settings?.isGiftWrapEnabled && (
              <div className="bg-[#fcfaf7] border border-[#eae5dc] p-6 flex items-start gap-5 mt-2">
                <div className="mt-0.5">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="giftWrapCheckboxCart"
                      checked={isGiftWrapped}
                      onChange={(e) => setIsGiftWrapped(e.target.checked)}
                      className="w-5 h-5 text-[#a68a56] border-[#d4af37] rounded-sm focus:ring-[#a68a56] bg-white cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label htmlFor="giftWrapCheckboxCart" className="font-headline-md text-xl text-on-surface cursor-pointer mb-1 block">
                    Pack this order as a gift
                  </label>
                  <p className="text-sm text-on-surface-variant">
                    Add premium gift wrapping and a handwritten heritage note (+{formatPrice(settings.giftWrapPrice || 0)})
                  </p>
                  
                  {isGiftWrapped && (
                    <div className="mt-4">
                      <textarea
                        value={giftMessage || ''}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        placeholder="Write a message to include with your gift..."
                        className="w-full bg-white border border-[#eae5dc] p-3 text-sm text-on-surface focus:border-[#a68a56] focus:ring-1 focus:ring-[#a68a56] outline-none min-h-[80px] resize-y rounded-sm"
                      ></textarea>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Promotions / Coupons (Keep functional but styled minimal) */}
            {(availablePromotions?.length > 0 || appliedPromotions?.length > 0) && (
              <div className="bg-white border border-[#eae5dc] p-6 mt-2">
                 <h3 className="font-headline-md text-xl text-on-surface mb-4">Promotions & Offers</h3>
                 
                 {appliedPromotions && appliedPromotions.length > 0 && (
                   <div className="mb-4 space-y-2">
                     {appliedPromotions.map((promo: any) => (
                       <div key={promo.id} className="flex items-center justify-between bg-[#fcfaf7] p-3 border border-[#eae5dc]">
                         <div className="flex items-center gap-2">
                           <span className="material-symbols-outlined text-[#a68a56] text-sm">check_circle</span>
                           <span className="text-sm font-medium">{promo.code || promo.name} applied</span>
                         </div>
                         <button 
                            onClick={() => promo.code ? removeCoupon() : removePromotion()}
                            className="text-[10px] uppercase tracking-wider text-[#93000a] hover:underline"
                         >
                           Remove
                         </button>
                       </div>
                     ))}
                   </div>
                 )}
                 
                 <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      placeholder="ENTER COUPON CODE"
                      className="flex-1 bg-transparent border border-[#eae5dc] px-4 py-2 text-sm focus:border-[#a68a56] outline-none uppercase"
                      disabled={isApplyingCoupon}
                    />
                    <button
                      onClick={() => handleApplyCoupon()}
                      disabled={!couponInput.trim() || isApplyingCoupon}
                      className="bg-[#2a2321] text-white px-6 py-2 text-xs uppercase tracking-widest hover:bg-[#1f1a18] disabled:opacity-50 transition-colors"
                    >
                      {isApplyingCoupon ? '...' : 'Apply'}
                    </button>
                 </div>
                 {couponError && <p className="text-[#93000a] text-xs mt-2">{couponError}</p>}
              </div>
            )}
            
            {/* Unlock Messages */}
            {unlockMessages && unlockMessages.length > 0 && (
               <div className="space-y-2">
                 {unlockMessages.map((msg, i) => (
                   <div key={i} className="text-xs text-[#a68a56] bg-[#a68a56]/5 p-3 border border-[#a68a56]/20 rounded-sm">
                     {msg}
                   </div>
                 ))}
               </div>
            )}
          </div>

          {/* Order Summary */}
          <div ref={summaryRef} className={`w-full lg:w-[38%] bg-white border border-[#eae5dc] p-8 sticky top-24 reveal ${summaryInView ? 'in-view' : ''}`}>
            <h2 className="font-headline-md text-[26px] text-on-surface mb-6">Order Summary</h2>
            
            <div className="w-full h-px bg-[#eae5dc] mb-6"></div>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-on-surface-variant">Items Subtotal</span>
                <span className="font-medium text-on-surface">{formatPrice(itemsSubtotalWithoutPackaging)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-on-surface-variant">Packaging Upgrades</span>
                <span className="font-medium text-on-surface">{formatPrice(packagingUpgradesPrice)}</span>
              </div>
              
              {(offerDiscount + cartDiscount) > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#a68a56]">Discount</span>
                  <span className="font-medium text-[#a68a56]">-{formatPrice(offerDiscount + cartDiscount)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-on-surface-variant">Shipping</span>
                <span className="italic text-on-surface-variant">
                  {shippingCost === 0 ? 'Complimentary' : formatPrice(shippingCost)}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-on-surface-variant">Gift Wrapping</span>
                <span className="font-medium text-on-surface">{formatPrice(selectedGiftPrice)}</span>
              </div>
            </div>
            
            <div className="w-full h-px bg-[#eae5dc] mb-6"></div>
            
            <div className="flex justify-between items-center mb-8">
              <span className="font-label-md text-xs uppercase tracking-[0.2em] text-on-surface-variant">Total</span>
              <span className="font-headline-md text-3xl text-on-surface">{formatPrice(total)}</span>
            </div>
            
            <Link
              to="/checkout"
              className="w-full bg-[#2a2321] hover:bg-[#1f1a18] text-white py-4 flex items-center justify-center gap-2 font-label-md text-xs uppercase tracking-[0.15em] transition-colors"
            >
              PROCEED TO CHECKOUT
              <span className="material-symbols-outlined text-[16px] leading-none select-none">&#xe5c8;</span> {/* arrow_forward */}
            </Link>
            
            <div className="mt-8 flex justify-center gap-6 text-[#8a8171]">
              <span className="material-symbols-outlined font-light text-[22px] select-none">&#xe897;</span> {/* lock */}
              <span className="material-symbols-outlined font-light text-[22px] select-none">&#xe558;</span> {/* local_shipping */}
              <span className="material-symbols-outlined font-light text-[22px] select-none">&#xe86c;</span> {/* verified */}
            </div>
            <div className="mt-4 text-center">
              <p className="text-[10px] font-label-md uppercase tracking-[0.2em] text-[#8a8171] leading-relaxed">
                SECURE CHECKOUT PROCESS<br/>
                AUTHENTIC ARTISANAL BLENDS
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

