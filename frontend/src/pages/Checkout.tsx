import React, { useState, useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { formatPrice } from '../utils/formatPrice';
import { profileService } from '../services/profileService';
import { orderService } from '../services/orderService';
import type { Address } from '../types';
import { AddressModal } from '../components/customer/AddressModal';
import { getImageUrl } from '../utils/getImageUrl';

import { useStoreSettings } from '../context/StoreSettingsContext';

export const Checkout: React.FC = () => {
  const { settings } = useStoreSettings();
  const { items, subtotal, offerDiscount, clearCart, couponCode, cartDiscount, applyCoupon, removeCoupon, isGiftWrapped, setIsGiftWrapped, giftMessage, setGiftMessage } = useCart();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const shippingThreshold = settings?.freeShippingThreshold !== undefined ? settings.freeShippingThreshold : 500;
  const totalAfterOffer = subtotal - offerDiscount;
  const shippingCharge = settings?.shippingCharge !== undefined ? settings.shippingCharge : 50;
  const isFreeShipping = false; // Add logic here if free shipping promos are brought back to the new design
  const shippingCost = isFreeShipping ? 0 : (totalAfterOffer > shippingThreshold ? 0 : shippingCharge);
  
  const selectedGiftPrice = (isGiftWrapped && settings?.isGiftWrapEnabled) ? (settings.giftWrapPrice || 0) : 0;

  const total = totalAfterOffer - cartDiscount + shippingCost + selectedGiftPrice;


  const [addresses, setAddresses] = useState<Address[]>([]);
  const [user, setUser] = useState<any>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | ''>('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUserData();
    fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

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

      const paymentOrder = await orderService.createPaymentOrder(couponCode || undefined, isGiftWrapped, giftMessage);

      if (paymentOrder.devMode) {
        // Backend is in PAYMENT_DEV_MODE — there's no real Razorpay order to open a checkout
        // widget against (it would fail validation against Razorpay's own servers), so simulate
        // a successful payment directly and go straight to order creation.
        try {
          const orderData = {
            shippingAddressId: Number(selectedAddressId),
            notes: notes,
            couponCode: couponCode || undefined,
            razorpayOrderId: paymentOrder.razorpayOrderId,
            razorpayPaymentId: `pay_dev_${Date.now()}`,
            razorpaySignature: 'dev_mode_signature',
            paymentMethod: 'cod',
            isGiftWrapped: isGiftWrapped,
            giftMessage: giftMessage || undefined,
            items: items.map(item => ({
              variantId: item.variantId,
              quantity: item.quantity,
              bottleId: item.bottle?.id || undefined,
              freeItem: item.freeItem || false,
              freePromotionId: item.freePromotionId
            }))
          };
          const apiRes = await orderService.createOrder(orderData);
          clearCart();
          navigate(`/checkout/success/${apiRes.data?.id}`);
        } catch (err: any) {
          setError(err.response?.data?.message || 'Payment verified but order creation failed. Please contact support.');
          setIsSubmitting(false);
        }
        return;
      }

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        setError('Failed to load Razorpay SDK. Please check your internet connection.');
        setIsSubmitting(false);
        return;
      }

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
              isGiftWrapped: isGiftWrapped,
              giftMessage: giftMessage || undefined,
              items: items.map(item => ({
                variantId: item.variantId,
                quantity: item.quantity,
                bottleId: item.bottle?.id || undefined,
                freeItem: item.freeItem || false,
                freePromotionId: item.freePromotionId
              }))
            };
            const apiRes = await orderService.createOrder(orderData);
            clearCart();
            navigate(`/checkout/success/${apiRes.data?.id}`);
          } catch (err: any) {
             setError(err.response?.data?.message || 'Payment verified but order creation failed. Please contact support.');
             setIsSubmitting(false);
          }
        },
        modal: {
          // Fires when the user closes the Razorpay overlay without completing payment (including
          // clicking outside it). Without this, isSubmitting was cleared right after rzp.open()
          // returned — re-enabling "Pay Securely" while the modal was still up, so a second click
          // could create a second payment-order for the same cart while the first was in progress.
          ondismiss: () => setIsSubmitting(false),
        },
        prefill: {
          name: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : '',
          email: user?.email,
          contact: addresses.find(a => a.id === selectedAddressId)?.phone || ''
        },
        theme: {
          color: "#121c2a"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError(response.error.description || 'Payment failed. Please try again.');
        setIsSubmitting(false);
      });

      rzp.open();
      // isSubmitting deliberately stays true here — the modal is open. It's cleared by the
      // handler's success (navigation away makes it moot), its catch block, payment.failed, or
      // modal.ondismiss above — not by a blanket finally, which used to fire immediately after
      // rzp.open() returns (the modal is non-blocking) rather than when payment actually resolves.
    } catch (err: any) {
      console.error("Failed to initiate payment", err);
      setError(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Checkout requires an account (no guest checkout) — this route isn't wrapped in
  // ProtectedRoute at the router level, so guard it here instead.
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-bright">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col font-body">
      {/* Minimal Header */}
      <header className="flex items-center justify-between px-6 py-6 border-b border-outline-variant/30 bg-surface-container-lowest sticky top-0 z-50">
        <Link to="/cart" className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-[16px]">arrow_left</span>
          Return to Cart
        </Link>
        <Link to="/" className="font-headline-lg text-2xl tracking-widest uppercase text-on-surface absolute left-1/2 -translate-x-1/2">
          AL AHAD ATTARS
        </Link>
        <div className="flex items-center gap-1.5 text-sm font-medium text-accent">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          Secure Checkout
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-12">
            {/* Header */}
            <div>
              <h1 className="font-headline-lg text-4xl mb-2 text-on-surface">Checkout</h1>
              <p className="flex items-center gap-1.5 text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-[16px] text-accent">shield</span>
                Secure checkout • Your information is protected
              </p>
            </div>

            {error && (
              <div className="bg-error/10 text-error p-4 rounded text-sm flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <p>{error}</p>
              </div>
            )}

            {/* Shipping Address */}
            <section>
              <h2 className="font-headline-md text-2xl mb-6 text-on-surface">Shipping Address</h2>
              {addresses.length > 0 ? (
                <div className="space-y-4">
                  {addresses.map(addr => (
                    <div 
                      key={addr.id} 
                      className={`border p-6 cursor-pointer relative ${selectedAddressId === addr.id ? 'border-accent bg-[#F9F7F0]' : 'border-outline-variant hover:border-accent/50'}`}
                      onClick={() => setSelectedAddressId(addr.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1 relative flex items-center justify-center">
                          <input 
                            type="radio" 
                            name="address" 
                            checked={selectedAddressId === addr.id} 
                            onChange={() => setSelectedAddressId(addr.id)} 
                            className="appearance-none w-4 h-4 border-2 border-outline-variant rounded-full checked:border-accent" 
                          />
                          {selectedAddressId === addr.id && <div className="absolute w-2 h-2 bg-accent rounded-full pointer-events-none" />}
                        </div>
                        <div className="flex-grow text-sm">
                          <div className="font-medium text-on-surface mb-1 tracking-wide">{addr.fullName}</div>
                          <div className="text-on-surface-variant leading-relaxed">
                            {addr.addressLine1}{addr.addressLine2 && `, ${addr.addressLine2}`}
                            <br />
                            {addr.city}, {addr.state} {addr.postalCode}
                            <br />
                            {addr.phone}
                          </div>
                        </div>
                        {selectedAddressId === addr.id && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setIsAddressModalOpen(true); }} 
                            className="text-accent text-[11px] font-medium tracking-wide hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => setIsAddressModalOpen(true)} 
                    className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent transition-colors tracking-wide mt-6 uppercase text-[12px]"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    ADD NEW ADDRESS
                  </button>
                </div>
              ) : (
                <div className="border border-outline-variant p-6 text-center">
                  <p className="mb-4 text-sm text-on-surface-variant">You don't have any saved addresses.</p>
                  <button onClick={() => setIsAddressModalOpen(true)} className="text-accent text-sm font-medium tracking-widest uppercase hover:underline">Add New Address</button>
                </div>
              )}
            </section>

            {/* Secure Online Payment */}
            <section>
              <h2 className="font-headline-md text-2xl mb-2 text-on-surface flex items-center gap-3">
                <span className="material-symbols-outlined text-accent text-2xl">lock</span>
                Secure Online Payment
              </h2>
              <p className="text-xs text-on-surface-variant mb-6 pb-6 border-b border-outline-variant/30">Your payment is securely processed by Razorpay.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-outline-variant/30 py-5 px-2 text-center text-sm text-on-surface bg-surface-container-lowest shadow-sm">UPI</div>
                <div className="border border-outline-variant/30 py-5 px-2 text-center text-sm text-on-surface bg-surface-container-lowest shadow-sm">Cards</div>
                <div className="border border-outline-variant/30 py-5 px-2 text-center text-sm text-on-surface bg-surface-container-lowest shadow-sm">Net Banking</div>
                <div className="border border-outline-variant/30 py-5 px-2 text-center text-sm text-on-surface bg-surface-container-lowest shadow-sm">Wallets</div>
              </div>
            </section>

            {/* Gift Wrapping */}
            {settings?.isGiftWrapEnabled && (
              <section className="border border-outline-variant/30 p-5 bg-surface-container-lowest shadow-sm">
                <label className="flex items-start gap-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGiftWrapped}
                    onChange={(e) => setIsGiftWrapped(e.target.checked)}
                    className="mt-1 w-5 h-5 border border-outline-variant text-accent focus:ring-accent accent-accent"
                  />
                  <div>
                    <div className="text-base text-on-surface">Pack as gift (+{formatPrice(settings.giftWrapPrice || 0)})</div>
                    <div className="text-sm text-on-surface-variant mt-1">Add a special touch to your order with our signature artisanal wrapping.</div>
                  </div>
                </label>
                {isGiftWrapped && (
                  <div className="mt-4 pl-9">
                    <textarea
                      value={giftMessage || ''}
                      onChange={(e) => setGiftMessage(e.target.value)}
                      placeholder="Gift Message (Optional)"
                      className="w-full bg-surface border border-outline-variant p-3 text-sm focus:border-accent focus:outline-none min-h-[80px] resize-y"
                    />
                  </div>
                )}
              </section>
            )}

            {/* Order Notes */}
            <section>
              <h2 className="font-body-md font-medium text-base mb-3 text-on-surface">Order Notes <span className="text-on-surface-variant font-normal">(Optional)</span></h2>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions for delivery or bespoke requests..."
                className="w-full bg-surface-container-lowest border border-outline-variant/50 p-4 text-sm focus:border-accent focus:outline-none min-h-[120px] resize-y shadow-sm"
              />
            </section>

          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <div className="border border-outline-variant/30 p-8 sticky top-24 bg-surface-container-lowest shadow-sm">
              <h2 className="font-headline-md text-2xl mb-8 text-on-surface">Order Summary</h2>

              {/* Items */}
              <div className="space-y-6 mb-6 pb-6 border-b border-outline-variant/30">
                {items.length === 0 ? (
                  <div className="text-sm text-on-surface-variant">Your cart is empty.</div>
                ) : items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-surface-container shrink-0 p-1">
                      {item.image ? (
                        <img className="w-full h-full object-cover" src={getImageUrl(item.image)} alt={item.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline">
                          <span className="material-symbols-outlined text-sm">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-grow flex justify-between items-start text-sm">
                      <div>
                        <div className="text-on-surface">{item.name}</div>
                        <div className="text-on-surface-variant text-xs mt-1">Qty {item.quantity}</div>
                      </div>
                      <div className="text-on-surface text-right">
                        {formatPrice((item.finalPrice || 0) * item.quantity)}
                        {item.discountAmount && item.discountAmount > 0 && (
                          <div className="text-xs text-on-surface-variant line-through mt-0.5">
                            {formatPrice((item.originalPrice || 0) * item.quantity)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Discount Code */}
              <div className="mb-6 pb-6 border-b border-outline-variant/30">
                <div className="text-[11px] text-on-surface-variant mb-3 tracking-wide">Discount Code</div>
                {couponCode ? (
                  <div className="flex items-center justify-between border border-outline-variant p-3 text-sm">
                    <span className="uppercase tracking-wider">{couponCode}</span>
                    <button onClick={removeCoupon} className="text-accent uppercase text-xs font-medium tracking-wider hover:underline">Remove</button>
                  </div>
                ) : (
                  <div className="flex border border-outline-variant/50 p-1 relative">
                    <input 
                      type="text" 
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      placeholder="Enter code" 
                      className="w-full pl-3 pr-20 py-2 text-sm bg-transparent outline-none"
                    />
                    <button
                      onClick={() => handleApplyCoupon()}
                      disabled={isApplyingCoupon || !couponInput.trim()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-accent text-[11px] font-medium tracking-[0.15em] uppercase hover:text-accent-hover transition-colors disabled:opacity-50"
                    >
                      {isApplyingCoupon ? '...' : 'APPLY'}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-error text-xs mt-2">{couponError}</p>}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-4 text-sm mb-6 pb-6 border-b border-outline-variant/30">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal</span>
                  <span className="text-on-surface">{formatPrice(subtotal)}</span>
                </div>
                
                {/* Packaging Upgrades */}
                {items.filter(i => i.bottle && i.bottle.price > 0).length > 0 && (
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Packaging Upgrades</span>
                    <span className="text-on-surface">{formatPrice(items.reduce((sum, i) => sum + ((i.bottle?.price || 0) * i.quantity), 0))}</span>
                  </div>
                )}

                {/* Gift Wrap */}
                {isGiftWrapped && settings?.isGiftWrapEnabled && (
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Gift Wrapping</span>
                    <span className="text-on-surface">{formatPrice(selectedGiftPrice)}</span>
                  </div>
                )}

                {/* Discounts */}
                {offerDiscount > 0 && (
                  <div className="flex justify-between text-accent">
                    <span>Product Discounts</span>
                    <span>-{formatPrice(offerDiscount)}</span>
                  </div>
                )}
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-accent">
                    <span>Cart Discount</span>
                    <span>-{formatPrice(cartDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-on-surface-variant">
                  <span>Shipping</span>
                  <span className={shippingCost === 0 ? "text-accent font-medium uppercase text-[11px] tracking-wider" : "text-on-surface"}>
                    {shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-base text-on-surface">Total</span>
                  <span className="font-headline-lg text-3xl text-on-surface tracking-wide">{formatPrice(total)}</span>
                </div>
                <div className="text-right text-[10px] text-on-surface-variant uppercase tracking-widest">
                  Includes all taxes
                </div>
              </div>

              {/* Pay Button */}
              <button
                onClick={placeOrder}
                disabled={isSubmitting || !selectedAddressId || items.length === 0}
                className="w-full bg-ink text-surface hover:bg-ink/90 transition-colors py-4 px-6 flex items-center justify-center gap-3 disabled:opacity-50 group shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <span className="font-label-sm uppercase tracking-[0.2em]">{isSubmitting ? 'Processing...' : 'Pay Securely'}</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
              
              <div className="text-center text-[9px] text-on-surface-variant uppercase tracking-[0.25em] mt-5">
                Powered by Razorpay
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="mt-auto border-t border-outline-variant/30 bg-surface-container-lowest py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <div className="uppercase tracking-widest text-[10px]">
            © {new Date().getFullYear()} AL AHAD ATTARS. HANDCRAFTED IN INDIA.
          </div>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-on-surface transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-on-surface transition-colors">Terms of Service</Link>
            <Link to="/shipping" className="hover:text-on-surface transition-colors">Shipping Info</Link>
          </div>
        </div>
      </footer>
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={fetchAddresses}
        editAddress={null}
      />
    </div>
  );
};
