import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { formatPrice } from '../utils/formatPrice';
import { profileService } from '../services/profileService';
import { orderService } from '../services/orderService';
import { giftServiceService } from '../services/giftServiceService';
import type { GiftServiceItem } from '../services/giftServiceService';
import type { Address } from '../types';
import { AddressModal } from '../components/customer/AddressModal';
import { getImageUrl } from '../utils/getImageUrl';

import { useStoreSettings } from '../context/StoreSettingsContext';
import { getPromoIcon, getPromoHeadline } from '../utils/promotionHelpers';

export const Checkout: React.FC = () => {
  const { settings } = useStoreSettings();
  const { items, subtotal, offerDiscount, clearCart, couponCode, cartDiscount, appliedPromotions, availablePromotions, lockedPromotions, applyCoupon, removeCoupon, manuallySelectedPromotionId, applyPromotion, removePromotion, unlockMessages } = useCart();
  const navigate = useNavigate();
  const shippingThreshold = settings?.freeShippingThreshold !== undefined ? settings.freeShippingThreshold : 500;
  const totalAfterOffer = subtotal - offerDiscount;
  const shippingCharge = settings?.shippingCharge !== undefined ? settings.shippingCharge : 50;
  const isFreeShipping = appliedPromotions && appliedPromotions.some((p: any) => p.name.includes('Free Shipping'));
  const shippingCost = isFreeShipping ? 0 : (totalAfterOffer > shippingThreshold ? 0 : shippingCharge);
  const [selectedGiftPrice, setSelectedGiftPrice] = useState(0);
  const total = totalAfterOffer - cartDiscount + shippingCost + selectedGiftPrice;
  const totalSavings = offerDiscount + cartDiscount;

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [user, setUser] = useState<any>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | ''>('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [notes, setNotes] = useState('');

  // Gift service state
  const [giftServices, setGiftServices] = useState<GiftServiceItem[]>([]);
  const [selectedGiftServiceId, setSelectedGiftServiceId] = useState<number | null>(null);
  const [giftMessage, setGiftMessage] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    fetchUserData();
    fetchAddresses();
    fetchGiftServices();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await profileService.getProfile();
      setUser(res.data);
    } catch (err) {
      console.error("Failed to load user", err);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await profileService.getAddresses();
      const userAddresses = res.data || [];
      setAddresses(userAddresses);
      const defaultAddr = userAddresses.find(a => a.defaultAddress) || userAddresses[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }
    } catch (err) {
      console.error("Failed to load addresses", err);
    }
  };

  const fetchGiftServices = async () => {
    try {
      const res = await giftServiceService.getActiveServices();
      setGiftServices(res.data || []);
    } catch (err) {
      console.error("Failed to load gift services", err);
    }
  };

  const handleSelectGiftService = (id: number | null, price: number) => {
    setSelectedGiftServiceId(id);
    setSelectedGiftPrice(price);
  };

  const handleApplyCoupon = async (code?: string) => {
    const codeToApply = code || couponInput.trim();
    if (!codeToApply) return;
    try {
      setIsApplyingCoupon(true);
      setCouponError('');
      await applyCoupon(codeToApply);
      setCouponInput('');
    } catch (err: any) {
      setCouponError(err.response?.data?.message || 'Invalid coupon code');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const placeOrder = async () => {
    if (!selectedAddressId) {
      setError('Please select a shipping address.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        setError('Failed to load Razorpay SDK. Please check your internet connection.');
        setIsSubmitting(false);
        return;
      }
      
      const paymentOrder = await orderService.createPaymentOrder(couponCode || undefined, selectedGiftServiceId);
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'YOUR_RAZORPAY_KEY_ID',
        currency: "INR",
        name: "Al Ahad Attars",
        description: "Premium Fragrances Order",
        order_id: paymentOrder.razorpayOrderId,
        handler: async function (response: any) {
          try {
            const orderData = {
              shippingAddressId: Number(selectedAddressId),
              notes: notes,
              couponCode: couponCode || undefined,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              giftServiceId: selectedGiftServiceId || undefined,
              giftMessage: giftMessage || undefined,
              items: items.map(item => ({
                variantId: item.variantId,
                quantity: item.quantity
              }))
            };
            const apiRes = await orderService.createOrder(orderData);
            clearCart();
            navigate(`/checkout/success/${apiRes.data?.id}`);
          } catch (err: any) {
             setError(err.response?.data?.message || 'Payment verified but order creation failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : '',
          email: user?.email,
          contact: addresses.find(a => a.id === selectedAddressId)?.phone || ''
        },
        theme: {
          color: "#0f172a"
        }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError(response.error.description || 'Payment failed. Please try again.');
      });
      
      rzp.open();
      
    } catch (err: any) {
      console.error("Failed to initiate payment", err);
      setError(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header className="w-full flex justify-center items-center h-24 border-b border-outline-variant/30 bg-surface/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <Link to="/" className="font-headline-md text-headline-md text-primary tracking-tight">Al Ahad Attars</Link>
      </header>
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16 md:py-24">
        <div className="mb-12">
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-4">Checkout</h1>
          <Link to="/cart" className="inline-flex items-center text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md">
            <span className="material-symbols-outlined mr-2" style={{ fontSize: '18px' }}>arrow_back</span>
            Return to Cart
          </Link>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-4 rounded mb-8">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-section-gap">
          <div className="lg:col-span-7 space-y-12">
            
            <section>
              <div className="flex justify-between items-center mb-6 border-b border-outline-variant pb-4">
                <h2 className="font-headline-md text-headline-md text-on-surface">Shipping Address</h2>
                <button onClick={() => setIsAddressModalOpen(true)} className="text-primary hover:underline font-label-sm">Add New Address</button>
              </div>
              
              {addresses.length > 0 ? (
                <div className="space-y-4">
                  {addresses.map(addr => (
                    <div key={addr.id} className={`border rounded-DEFAULT p-4 cursor-pointer transition-colors ${selectedAddressId === addr.id ? 'border-primary bg-primary-container/10' : 'border-outline-variant hover:border-primary/50'}`} onClick={() => setSelectedAddressId(addr.id)}>
                      <div className="flex items-start gap-4">
                        <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} className="mt-1 text-primary focus:ring-primary" />
                        <div>
                          <div className="font-headline-sm font-medium">{addr.fullName}</div>
                          <div className="font-body-md text-on-surface-variant mt-1">
                            {addr.addressLine1}, {addr.addressLine2 && `${addr.addressLine2}, `}
                            {addr.city}, {addr.state} {addr.postalCode}, {addr.country}
                          </div>
                          <div className="font-body-md text-on-surface-variant mt-1">
                            Phone: {addr.phone}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface-container border border-outline-variant rounded p-6 text-center">
                  <p className="mb-4">You don't have any saved addresses.</p>
                  <button onClick={() => setIsAddressModalOpen(true)} className="btn-primary px-6 py-2 rounded">Add New Address</button>
                </div>
              )}
            </section>
            
            <section>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-8 border-b border-outline-variant pb-4">Secure Online Payment</h2>
              <div className="bg-surface relative border border-primary/20 rounded-xl p-8 shadow-[0_4px_24px_-4px_rgba(212,175,55,0.08)] overflow-hidden">
                {/* Subtle gold accent top border */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[24px]">lock</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-lg text-on-surface tracking-wide">Secure Checkout</h3>
                    <p className="font-body-sm text-on-surface-variant mt-1">Your payment is encrypted and securely processed by Razorpay.</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-outline-variant/30">
                  <h4 className="font-label-sm uppercase tracking-widest text-on-surface-variant mb-4">Accepted Payment Methods</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-sm font-body-md text-on-surface bg-surface-container-lowest px-3 py-2 rounded-lg border border-outline-variant/50">
                      <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> UPI
                    </div>
                    <div className="flex items-center gap-2 text-sm font-body-md text-on-surface bg-surface-container-lowest px-3 py-2 rounded-lg border border-outline-variant/50">
                      <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> Credit Cards
                    </div>
                    <div className="flex items-center gap-2 text-sm font-body-md text-on-surface bg-surface-container-lowest px-3 py-2 rounded-lg border border-outline-variant/50">
                      <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> Debit Cards
                    </div>
                    <div className="flex items-center gap-2 text-sm font-body-md text-on-surface bg-surface-container-lowest px-3 py-2 rounded-lg border border-outline-variant/50">
                      <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> Net Banking
                    </div>
                    <div className="flex items-center gap-2 text-sm font-body-md text-on-surface bg-surface-container-lowest px-3 py-2 rounded-lg border border-outline-variant/50">
                      <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> Wallets
                    </div>
                    <div className="flex items-center gap-2 text-sm font-body-md text-on-surface bg-surface-container-lowest px-3 py-2 rounded-lg border border-outline-variant/50">
                      <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span> EMI
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant flex items-center gap-1.5 font-medium">
                    Powered by <span className="font-bold text-on-surface tracking-wider">Razorpay</span>
                  </span>
                </div>
              </div>
            </section>

            {/* Gift Services Section */}
            {giftServices.length > 0 && (
              <section>
                <div className="mb-6 border-b border-outline-variant pb-4">
                  <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">redeem</span>
                    Make it a Gift
                  </h2>
                  <p className="text-on-surface-variant font-body-sm mt-1">Choose a premium packaging option for a special touch.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {/* No Gift Option */}
                  <div
                    onClick={() => handleSelectGiftService(null, 0)}
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 flex items-center gap-3 ${
                      selectedGiftServiceId === null
                        ? 'border-primary bg-primary/[0.04] shadow-sm'
                        : 'border-outline-variant hover:border-primary/40'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant text-[24px]">remove_shopping_cart</span>
                    </div>
                    <div className="flex-grow">
                      <p className="font-label-md text-on-surface">No Gift Wrapping</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">Standard packaging</p>
                    </div>
                    {selectedGiftServiceId === null && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-primary text-[14px]">check</span>
                      </span>
                    )}
                  </div>

                  {/* Gift Service Options */}
                  {giftServices.map(service => (
                    <div
                      key={service.id}
                      onClick={() => handleSelectGiftService(service.id, service.price)}
                      className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 flex items-center gap-3 ${
                        selectedGiftServiceId === service.id
                          ? 'border-primary bg-primary/[0.04] shadow-sm'
                          : 'border-outline-variant hover:border-primary/40'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
                        {service.imageUrl ? (
                          <img src={getImageUrl(service.imageUrl)} alt={service.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">card_giftcard</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="font-label-md text-on-surface truncate">{service.name}</p>
                        {service.description && (
                          <p className="text-xs text-on-surface-variant mt-0.5 truncate">{service.description}</p>
                        )}
                        <p className="text-xs font-medium text-primary mt-1">{formatPrice(service.price)}</p>
                      </div>
                      {selectedGiftServiceId === service.id && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-primary text-[14px]">check</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Gift Message */}
                <div>
                  <label className="block font-label-md text-on-surface mb-2">
                    Gift Message <span className="text-on-surface-variant font-body-sm">(Optional)</span>
                  </label>
                  <textarea
                    value={giftMessage}
                    onChange={e => setGiftMessage(e.target.value.slice(0, 250))}
                    maxLength={250}
                    rows={3}
                    placeholder="Happy Birthday! Wishing you all the best... 🎉"
                    className="w-full bg-transparent border border-outline-variant rounded-lg p-3 text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                  />
                  <p className="text-xs text-on-surface-variant text-right mt-1">{giftMessage.length}/250</p>
                </div>
              </section>
            )}

            <section>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 border-b border-outline-variant pb-4">Order Notes (Optional)</h2>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-transparent border border-outline-variant rounded p-3 text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[100px]" 
                placeholder="Notes about your order, e.g. special notes for delivery."
              ></textarea>
            </section>

          </div>
          
          {/* Right Side: Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-surface-container-lowest border border-outline-variant/50 p-8 sticky top-32 rounded-lg shadow-[0_10px_30px_rgba(31,41,55,0.04)]">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Order Summary</h2>
              
              <div className="space-y-6 mb-8 border-b border-outline-variant/30 pb-8 max-h-[40vh] overflow-y-auto pr-2">
                {items.length === 0 ? (
                  <div className="text-center text-on-surface-variant font-body-md">Your cart is empty.</div>
                ) : items.map((item) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="w-20 h-24 bg-surface-container relative shrink-0 rounded overflow-hidden">
                      {item.image ? (
                        <img className="w-full h-full object-cover" src={getImageUrl(item.image)} alt={item.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline">
                          <span className="material-symbols-outlined">image</span>
                        </div>
                      )}
                      <span className="absolute -top-2 -right-2 bg-on-surface text-surface w-6 h-6 rounded-full flex items-center justify-center font-label-sm text-label-sm shadow-md">{item.quantity}</span>
                    </div>
                    <div className="flex-grow flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-headline-sm text-on-surface leading-tight">{item.name}</h3>
                        <p className="font-body-sm text-on-surface-variant mt-1 text-sm">Size: {item.size}</p>
                      </div>
                      <div className="font-body-md font-medium text-on-surface mt-2">
                        {formatPrice((item.finalPrice || 0) * item.quantity)}
                        {item.discountAmount && item.discountAmount > 0 && (
                          <span className="text-xs text-on-surface-variant line-through ml-2">
                            {formatPrice((item.originalPrice || 0) * item.quantity)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Offers Section */}
              {(appliedPromotions.length > 0 || availablePromotions.length > 0 || lockedPromotions.length > 0) && (
                <div className="border-b border-outline-variant/30 pb-6 mb-6">
                  {/* Applied Offers Section */}
                  {appliedPromotions && appliedPromotions.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-label-sm uppercase tracking-[0.15em] text-on-surface-variant mb-2">Applied Offer</h3>
                      {appliedPromotions.map((promo: any) => {
                          const icon = getPromoIcon(promo);
                          const isManual = promo.id === manuallySelectedPromotionId;
                          
                          return (
                            <div key={promo.id} className="bg-gradient-to-r from-primary/[0.04] to-transparent border border-primary/25 rounded-lg p-3 mb-2 flex items-start gap-3">
                              <span className="text-lg mt-0.5" aria-hidden="true">{icon}</span>
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-label-md text-sm text-primary">{getPromoHeadline(promo)}</span>
                                  <span className="bg-primary/10 text-primary text-[9px] font-label-md px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[10px]">check_circle</span>
                                    Applied
                                  </span>
                                </div>
                                <div className="flex justify-between items-end mt-1">
                                  <span className="text-[11px] text-on-surface-variant">
                                    {isManual ? 'Manually Applied' : 'Automatically Applied'}
                                  </span>
                                  {(!promo.stackable) && (
                                    <button
                                      onClick={() => removePromotion()}
                                      className="text-error hover:text-error/80 transition-colors flex items-center gap-0.5 font-label-sm uppercase tracking-wider text-[10px] whitespace-nowrap"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">close</span>
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
                    <div className="mb-4">
                      <h3 className="font-label-sm uppercase tracking-[0.15em] text-on-surface-variant mb-3">Available Offers</h3>
                      <div className="space-y-3">
                        {availablePromotions.map((promo: any) => {
                          const icon = getPromoIcon(promo);
                          
                          return (
                            <div key={promo.id} className="bg-surface-container border border-outline-variant/40 p-3 rounded-lg flex items-start gap-3 transition-colors">
                              <span className="text-lg mt-0.5" aria-hidden="true">{icon}</span>
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-label-md text-sm text-on-surface">
                                    {getPromoHeadline(promo)}
                                  </span>
                                </div>
                                
                                <div className="flex items-center justify-between gap-2 mt-1.5">
                                  {promo.code ? (
                                    <span className="font-mono text-[11px] font-semibold text-primary bg-primary/[0.06] px-2 py-0.5 rounded border border-primary/10">
                                      {promo.code}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-on-surface-variant">
                                      Eligible
                                    </span>
                                  )}
                                  
                                  {promo.code ? (
                                    <button
                                      onClick={() => handleApplyCoupon(promo.code || '')}
                                      disabled={isApplyingCoupon}
                                      className="text-[11px] font-label-md text-primary hover:text-on-primary hover:bg-primary px-2.5 py-0.5 rounded border border-primary/20 transition-colors disabled:opacity-50"
                                    >
                                      Apply
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => applyPromotion(promo.id)}
                                      className="text-[11px] font-label-md px-2.5 py-0.5 rounded transition-colors text-primary hover:text-on-primary hover:bg-primary border border-primary/20"
                                    >
                                      Apply
                                    </button>
                                  )}
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
                    <div className="mb-4">
                      <h3 className="font-label-sm uppercase tracking-[0.15em] text-on-surface-variant mb-3">Locked Offers</h3>
                      <div className="space-y-3">
                        {lockedPromotions.map((promo: any) => {
                          const icon = getPromoIcon(promo);
                          const msg = unlockMessages?.find((m: any) => m.includes(promo.name)) || 'Conditions not met';
                          
                          return (
                            <div key={promo.id} className="bg-surface-container/50 border border-outline-variant/20 p-3 rounded-lg flex items-start gap-3 transition-colors opacity-75">
                              <span className="text-lg mt-0.5" aria-hidden="true">{icon}</span>
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-label-md text-sm text-on-surface-variant">
                                    {getPromoHeadline(promo)}
                                  </span>
                                </div>
                                <div className="mt-1.5">
                                  <span className="text-[11px] text-error flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">lock</span>
                                    {msg}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-4 font-body-md text-body-md mt-6">
                
                {/* Coupon Input Area */}
                <div className="border-b border-outline-variant/30 pb-6 mb-2">
                  <h3 className="font-label-md text-on-surface mb-3 uppercase tracking-wider text-sm">Discount Code</h3>
                  {couponCode ? (
                    <div className="flex items-center justify-between bg-primary/[0.05] border border-primary/15 rounded-lg p-3 text-primary">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">local_offer</span>
                        <span className="font-label-md uppercase tracking-wider">{couponCode}</span>
                      </div>
                      <button onClick={removeCoupon} className="text-on-surface-variant hover:text-error transition-colors" title="Remove Coupon" aria-label="Remove coupon">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                          placeholder="Enter coupon code" 
                          className="flex-1 bg-transparent border border-outline-variant rounded-lg px-4 py-3 text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none uppercase transition-all"
                          aria-label="Coupon code input"
                        />
                        <button 
                          onClick={() => handleApplyCoupon()}
                          disabled={isApplyingCoupon || !couponInput.trim()}
                          className="bg-surface-variant text-on-surface-variant hover:bg-surface-tint hover:text-on-primary px-6 py-3 rounded-lg transition-colors disabled:opacity-50 font-label-md tracking-wider"
                        >
                          {isApplyingCoupon ? '…' : 'APPLY'}
                        </button>
                      </div>
                      {couponError && <p className="text-error text-sm mt-2">{couponError}</p>}
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-on-surface-variant py-1">
                  <span>Subtotal</span>
                  <span className="font-medium text-on-surface">{formatPrice(subtotal)}</span>
                </div>
                {offerDiscount > 0 && (
                  <div className="flex justify-between text-primary py-1">
                    <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">sell</span> Product Discounts</span>
                    <span className="font-medium">-{formatPrice(offerDiscount)}</span>
                  </div>
                )}
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-primary py-1">
                    <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">local_offer</span> Cart Discount</span>
                    <span className="font-medium">-{formatPrice(cartDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-on-surface-variant py-1">
                  <span>Shipping</span>
                  <span className="text-on-surface font-medium">
                    {shippingCost === 0 ? <span className="text-primary font-medium tracking-wide">FREE</span> : formatPrice(shippingCost)}
                  </span>
                </div>
                {selectedGiftServiceId && selectedGiftPrice > 0 && (
                  <div className="flex justify-between text-on-surface-variant py-1">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">redeem</span>
                      Gift Wrapping
                    </span>
                    <span className="font-medium text-on-surface">{formatPrice(selectedGiftPrice)}</span>
                  </div>
                )}

                <div className="border-t border-outline-variant/50 pt-6 mt-6">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-headline-md text-headline-md text-on-surface tracking-wide">Total</span>
                    <span className="font-headline-md text-headline-md text-on-surface">
                      <span className="text-sm font-body-md text-on-surface-variant font-normal mr-2">INR</span>{formatPrice(total)}
                    </span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="text-right">
                      <span className="text-[11px] font-label-sm uppercase tracking-[0.2em] text-primary/80">
                        Total Savings: {formatPrice(totalSavings)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-outline-variant/30">
                <button 
                  onClick={placeOrder}
                  disabled={isSubmitting || !selectedAddressId || items.length === 0}
                  className="w-full bg-gradient-to-r from-primary to-[#C59B27] hover:from-[#C59B27] hover:to-[#A67C00] text-on-primary py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(212,175,55,0.25)] hover:shadow-[0_10px_25px_rgba(212,175,55,0.35)] transition-all duration-300 disabled:opacity-50 disabled:shadow-none"
                >
                  <span className="material-symbols-outlined">{isSubmitting ? 'hourglass_empty' : 'lock'}</span>
                  <span className="font-label-lg tracking-widest text-[15px]">{isSubmitting ? 'PROCESSING PAYMENT...' : 'PAY SECURELY'}</span>
                </button>
                <div className="flex flex-col items-center justify-center gap-2 mt-5">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant flex items-center gap-1.5 font-medium">
                    Powered by <span className="font-bold text-on-surface tracking-wider">Razorpay</span>
                  </span>
                  <span className="text-[9px] text-on-surface-variant/70 tracking-widest uppercase flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">shield</span>
                    256-bit SSL Secure Payment
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <AddressModal 
        isOpen={isAddressModalOpen} 
        onClose={() => setIsAddressModalOpen(false)} 
        onSave={fetchAddresses} 
        editAddress={null} 
      />
    </>
  );
};
