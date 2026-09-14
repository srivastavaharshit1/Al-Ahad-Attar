import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { formatPrice } from '../utils/formatPrice';
import { profileService } from '../services/profileService';
import { orderService } from '../services/orderService';
import type { Address } from '../types';
import { AddressModal } from '../components/customer/AddressModal';
import { getImageUrl } from '../utils/getImageUrl';
import { useStoreSettings } from '../context/StoreSettingsContext';

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

export const Checkout: React.FC = () => {
  const { settings } = useStoreSettings();
  const {
    items, subtotal, offerDiscount, clearCart,
    couponCode, cartDiscount, applyCoupon, removeCoupon,
    isGiftWrapped, setIsGiftWrapped, giftMessage, setGiftMessage,
    appliedPromotions,
  } = useCart();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  // ─── Derived Pricing (existing logic) ──────────────────────────
  const shippingThreshold = settings?.freeShippingThreshold !== undefined ? settings.freeShippingThreshold : 500;
  const totalAfterOffer = subtotal - offerDiscount;
  const shippingCharge = settings?.shippingCharge !== undefined ? settings.shippingCharge : 50;
  const isFreeShipping = appliedPromotions && appliedPromotions.some(
    (p: any) => p.name?.includes('Free Shipping') || p.description?.includes('Free Shipping')
  );
  const shippingCost = isFreeShipping ? 0 : (totalAfterOffer > shippingThreshold ? 0 : shippingCharge);
  const selectedGiftPrice = (isGiftWrapped && settings?.isGiftWrapEnabled) ? (settings.giftWrapPrice || 0) : 0;
  const total = totalAfterOffer - cartDiscount + shippingCost + selectedGiftPrice;

  // ─── Free Shipping Progress ───────────────────────────────────────────────
  const amountToFreeShipping = Math.max(0, shippingThreshold - totalAfterOffer);
  const freeShippingProgress = Math.min(100, (totalAfterOffer / shippingThreshold) * 100);
  const packagingTotal = items.reduce((sum, i) => sum + ((i.bottle?.price || 0) * i.quantity), 0);

  // ─── Existing State ───────────────────────────────────────────────────────
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [user, setUser] = useState<any>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | ''>('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [checkoutMode, setCheckoutMode] = useState<'auth_entry' | 'guest' | 'user'>(
    isAuthenticated ? 'user' : 'auth_entry'
  );
  const [guestEmail, setGuestEmail] = useState('');
  const [guestAddress, setGuestAddress] = useState<any>({
    fullName: '', phone: '', addressLine1: '', addressLine2: '',
    city: '', state: '', postalCode: '', country: 'India',
  });
  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [couponError, setCouponError] = useState('');
  const [formErrors, setFormErrors] = useState<{ email?: string, phone?: string }>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGuestEmail(val);
    if (formErrors.email && validateEmail(val)) {
      setFormErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handleEmailBlur = () => {
    if (guestEmail && !validateEmail(guestEmail)) {
      setFormErrors((prev) => ({ ...prev, email: 'Please enter a valid email address.' }));
    } else {
      setFormErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setGuestAddress({ ...guestAddress, phone: val });
    if (formErrors.phone && validatePhone(val)) {
      setFormErrors((prev) => ({ ...prev, phone: undefined }));
    }
  };

  const handlePhoneBlur = () => {
    if (guestAddress.phone && !validatePhone(guestAddress.phone)) {
      setFormErrors((prev) => ({ ...prev, phone: 'Please enter a valid 10-digit mobile number.' }));
    } else {
      setFormErrors((prev) => ({ ...prev, phone: undefined }));
    }
  };

  // ─── Existing Effects & Handlers ─────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      setCheckoutMode('user');
      fetchUserData();
      fetchAddresses();
    } else {
      setCheckoutMode('auth_entry');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchUserData = async () => {
    try {
      const res = await profileService.getProfile();
      setUser(res.data);
    } catch (err) {
      console.error('Failed to load user', err);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await profileService.getAddresses();
      const userAddresses = res.data || [];
      setAddresses(userAddresses);
      const defaultAddr = userAddresses.find((a: Address) => a.defaultAddress) || userAddresses[0];
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
    } catch (err) {
      console.error('Failed to load addresses', err);
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
    const isGuest = checkoutMode === 'guest';
    if (!isGuest && !selectedAddressId) {
      setError('Please select a shipping address.');
      return;
    }
    if (isGuest) {
      if (!guestEmail || !guestAddress.fullName || !guestAddress.phone || !guestAddress.addressLine1 || !guestAddress.city || !guestAddress.state || !guestAddress.postalCode) {
        setError('Please fill in all required guest information.');
        return;
      }
      if (!validateEmail(guestEmail)) {
        setFormErrors((prev) => ({ ...prev, email: 'Please enter a valid email address.' }));
        setError('Please enter a valid email address.');
        return;
      }
      if (!validatePhone(guestAddress.phone)) {
        setFormErrors((prev) => ({ ...prev, phone: 'Please enter a valid 10-digit mobile number.' }));
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
    }
    try {
      setIsSubmitting(true);
      setError('');

      const guestCart = isGuest ? {
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          freeItem: item.freeItem || false,
          freePromotionId: item.freePromotionId,
          bottleId: item.bottle?.id,
        })),
      } : undefined;

      const paymentOrder = await orderService.createPaymentOrder(couponCode || undefined, isGiftWrapped, giftMessage, guestCart);

      const orderData: any = {
        notes,
        couponCode: couponCode || undefined,
        paymentMethod: 'ONLINE',
        isGiftWrapped,
        giftMessage: giftMessage || undefined,
        items: items.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          bottleId: item.bottle?.id || undefined,
          freeItem: item.freeItem || false,
          freePromotionId: item.freePromotionId,
        })),
      };

      if (isGuest) {
        orderData.guestEmail = guestEmail;
        orderData.guestName = guestAddress.fullName;
        orderData.guestPhone = guestAddress.phone;
        orderData.guestAddress = guestAddress;
      } else {
        orderData.shippingAddressId = Number(selectedAddressId);
      }

      if (paymentOrder.devMode) {
        try {
          orderData.razorpayOrderId = paymentOrder.razorpayOrderId;
          orderData.razorpayPaymentId = `pay_dev_${Date.now()}`;
          orderData.razorpaySignature = 'dev_mode_signature';
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
        currency: 'INR',
        name: 'Al Ahad Attars',
        description: 'Premium Fragrances Order',
        order_id: paymentOrder.razorpayOrderId,
        handler: async function (response: any) {
          try {
            orderData.razorpayOrderId = response.razorpay_order_id;
            orderData.razorpayPaymentId = response.razorpay_payment_id;
            orderData.razorpaySignature = response.razorpay_signature;
            const apiRes = await orderService.createOrder(orderData);
            clearCart();
            navigate(`/checkout/success/${apiRes.data?.id}`);
          } catch (err: any) {
            setError(err.response?.data?.message || 'Payment verified but order creation failed. Please contact support.');
            setIsSubmitting(false);
          }
        },
        modal: { ondismiss: () => setIsSubmitting(false) },
        prefill: {
          name: isGuest ? guestAddress.fullName : (user?.firstName ? `${user.firstName} ${user.lastName || ''}` : ''),
          email: isGuest ? guestEmail : user?.email,
          contact: isGuest ? guestAddress.phone : (addresses.find(a => a.id === selectedAddressId)?.phone || ''),
        },
        theme: { color: C.goldDark },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError(response.error.description || 'Payment failed. Please try again.');
        setIsSubmitting(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Failed to initiate payment', err);
      setError(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
      setIsSubmitting(false);
    }
  };

  // ─── Loading State ────────────────────────────────────────────────────────
  if (isAuthLoading) {
    return (
      <div style={{ backgroundColor: C.bg }} className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${C.gold}40`, borderTopColor: 'transparent', borderRightColor: C.gold }} />
      </div>
    );
  }

  // ─── Shared Input Style ───────────────────────────────────────────────────
  const inputCls = `w-full px-4 py-3 text-sm rounded-lg border transition-colors outline-none focus:ring-1`
    + ` text-[${C.navy}] placeholder-[#9ca3af]`
    + ` border-[${C.border}] focus:border-[${C.gold}] focus:ring-[${C.gold}]`;

  const labelCls = `block text-[10px] font-bold uppercase tracking-wider mb-2 text-[${C.navy}]`;

  // ─── Pay Button shared ────────────────────────────────────────────────────
  const payDisabled = isSubmitting || (checkoutMode === 'user' && !selectedAddressId) || items.length === 0;

  const PayButton = ({ full = true, showPrice = true }: { full?: boolean, showPrice?: boolean }) => (
    <button
      onClick={placeOrder}
      disabled={payDisabled}
      style={{
        background: payDisabled ? '#b0a070' : `linear-gradient(to right, ${C.gold}, ${C.goldDark})`,
      }}
      className={`${full ? 'w-full' : ''} flex items-center justify-center gap-2 py-4 px-6 rounded-lg text-white font-semibold text-sm uppercase tracking-wider transition-all duration-200 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] shadow-md`}
    >
      <span className="material-symbols-outlined text-[18px]">lock</span>
      {isSubmitting ? 'PROCESSING...' : (showPrice ? `PAY ${formatPrice(total)} SECURELY` : 'PAY SECURELY')}
    </button>
  );

  // ─── Order Summary ────────────────────────────────────────────────────────
  const OrderSummaryContent = () => (
    <>
      {/* Items */}
      <div className="space-y-4 mb-6 pb-6 border-b" style={{ borderColor: C.border }}>
        {items.length === 0 ? (
          <p className="text-sm" style={{ color: C.navyLight }}>Your cart is empty.</p>
        ) : items.map((item) => (
          <div key={item.id} className="flex gap-4">
            <div className="w-16 h-16 rounded-md overflow-hidden shrink-0 border bg-white" style={{ borderColor: C.border }}>
              {item.image ? (
                <img className="w-full h-full object-cover" src={getImageUrl(item.image)} alt={item.name} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl" style={{ color: C.navyLight }}>image</span>
                </div>
              )}
            </div>
            <div className="flex-grow min-w-0 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="font-serif text-[17px]" style={{ color: C.navy }}>{item.name}</div>
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: C.navyLight }}>{item.size} • Concentrated Perfume Oil</div>
              <div className="flex justify-between items-end mt-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.navyLight }}>QTY: {item.quantity}</div>
                <div className="text-sm font-semibold" style={{ color: C.navy }}>
                  {formatPrice((item.finalPrice || 0) * item.quantity)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Free Shipping Progress */}
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

      {/* Coupon Code */}
      <div className="mb-6 pb-6 border-b" style={{ borderColor: C.border }}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: C.navyLight }}>DISCOUNT CODE</div>
        {couponCode ? (
          <div className="flex items-center justify-between px-4 py-3 rounded border text-sm" style={{ borderColor: C.goldBorder, backgroundColor: C.goldBg }}>
            <span className="uppercase font-mono tracking-wider text-xs font-semibold" style={{ color: C.goldDark }}>{couponCode}</span>
            <button onClick={removeCoupon} className="text-[10px] font-bold uppercase tracking-wider hover:underline" style={{ color: C.goldDark }}>REMOVE</button>
          </div>
        ) : (
          <div className="flex rounded overflow-hidden">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
              placeholder="ENTER DISCOUNT CODE"
              className="flex-grow px-4 py-3 text-[11px] outline-none font-semibold tracking-wider uppercase border-y border-l"
              style={{ backgroundColor: C.inputBg, borderColor: C.border, color: C.navy }}
            />
            <button
              onClick={() => handleApplyCoupon()}
              disabled={isApplyingCoupon || !couponInput.trim()}
              className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: C.goldDark }}
            >
              {isApplyingCoupon ? '...' : 'APPLY'}
            </button>
          </div>
        )}
        {couponError && <p className="text-[11px] mt-2" style={{ color: C.error }}>{couponError}</p>}
      </div>

      {/* Breakdown */}
      <div className="space-y-3 text-xs mb-6 pb-6 border-b" style={{ borderColor: C.border }}>
        <div className="flex justify-between">
          <span style={{ color: C.navyLight }}>Subtotal</span>
          <span style={{ color: C.navy }}>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: C.navyLight }}>Packaging</span>
          <span className="uppercase" style={{ color: C.goldDark }}>{packagingTotal > 0 ? formatPrice(packagingTotal) : 'STANDARD (FREE)'}</span>
        </div>
        {isGiftWrapped && settings?.isGiftWrapEnabled && (
          <div className="flex justify-between">
            <span style={{ color: C.navyLight }}>Gift Wrapping</span>
            <span style={{ color: C.navy }}>{formatPrice(selectedGiftPrice)}</span>
          </div>
        )}
        {offerDiscount > 0 && (
          <div className="flex justify-between">
            <span style={{ color: C.goldDark }}>Product Discounts</span>
            <span style={{ color: C.goldDark }}>-{formatPrice(offerDiscount)}</span>
          </div>
        )}
        {cartDiscount > 0 && (
          <div className="flex justify-between">
            <span style={{ color: C.goldDark }}>Cart Discount</span>
            <span style={{ color: C.goldDark }}>-{formatPrice(cartDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span style={{ color: C.navyLight }}>Standard Shipping</span>
          <span style={{ color: shippingCost === 0 ? C.success : C.navy, fontWeight: shippingCost === 0 ? 600 : 400 }}>
            {shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="block text-base font-serif" style={{ color: C.navy }}>Total</span>
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: C.navyLight }}>INCLUDES ALL TAXES</span>
        </div>
        <span className="text-3xl font-serif" style={{ color: C.navy }}>{formatPrice(total)}</span>
      </div>

      {/* Desktop Pay Button */}
      {checkoutMode === 'auth_entry' ? (
        <button disabled className="w-full py-4 px-6 rounded-lg text-[11px] font-bold uppercase tracking-widest opacity-40 cursor-not-allowed" style={{ backgroundColor: C.navy, color: 'white' }}>
          Select account preference first
        </button>
      ) : (
        <PayButton showPrice={true} />
      )}

      {/* Trust Guarantee */}
      <div className="mt-4 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: C.navyLight }}>
        100% AUTHENTIC ARTISANAL FRAGRANCE GUARANTEE
      </div>
    </>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col font-body" style={{ backgroundColor: C.bg }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-50 px-4 md:px-8 py-3 md:py-4 border-b flex flex-col md:flex-row items-center justify-between"
        style={{ backgroundColor: C.bg, borderColor: C.border }}
      >
        <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-4">
           <Link to="/cart" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors hover:opacity-70" style={{ color: C.navy }}>
             <span className="material-symbols-outlined text-sm">arrow_back</span>
             <span className="hidden sm:inline">RETURN TO CART</span>
           </Link>
           
           <div className="md:hidden">
             <Link to="/" className="block">
                <span className="font-serif text-lg tracking-[0.1em]" style={{ color: C.goldDark }}>AL AHAD ATTARS</span>
             </Link>
           </div>
           
           <Link to="/account/dashboard" className="md:hidden w-8 h-8 rounded-full border flex items-center justify-center" style={{ borderColor: C.border, color: C.navyLight }}>
             <span className="material-symbols-outlined text-[16px]">person</span>
           </Link>
        </div>

        <div className="hidden md:block absolute left-1/2 -translate-x-1/2 text-center">
          <Link to="/" className="block">
             <span className="font-serif text-2xl tracking-[0.15em]" style={{ color: C.goldDark }}>AL AHAD ATTARS</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
           <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: C.navyLight }}>
             <span className="material-symbols-outlined text-[14px]">lock</span>
             SECURE CHECKOUT
           </div>
           <Link to="/account/dashboard" className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-white transition-colors" style={{ borderColor: C.border, color: C.navyLight }}>
             <span className="material-symbols-outlined text-[16px]">person</span>
           </Link>
        </div>
      </header>

      {/* ── Progress Bar ── */}
      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        <div className="relative flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
          {/* Connecting Line */}
          <div className="absolute top-4 left-0 w-full h-[2px]" style={{ backgroundColor: C.border, zIndex: 0 }}></div>
          <div className="absolute top-4 left-0 h-[2px] transition-all duration-500" style={{ backgroundColor: C.gold, width: checkoutMode === 'auth_entry' ? '0%' : (checkoutMode === 'guest' || checkoutMode === 'user' ? '50%' : '100%'), zIndex: 1 }}></div>

          {/* Steps */}
          {[
            { num: '1', label: '01. ACCOUNT', active: true },
            { num: '2', label: '02. CONTACT', active: checkoutMode !== 'auth_entry' },
            { num: '3', label: '03. DELIVERY', active: checkoutMode !== 'auth_entry' },
            { num: '4', label: '04. PAYMENT', active: checkoutMode !== 'auth_entry' },
          ].map((step, idx) => (
            <div key={step.num} className="relative z-10 flex flex-col items-center gap-2" style={{ width: '80px' }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: step.active ? C.gold : C.bg,
                  color: step.active ? 'white' : C.navyLight,
                  border: `2px solid ${step.active ? C.gold : C.border}`
                }}
              >
                {step.active && idx === 0 && checkoutMode !== 'auth_entry' ? <span className="material-symbols-outlined text-[16px]">check</span> : step.num}
              </div>
              <span style={{ color: step.active ? C.goldDark : C.navyLight, textAlign: 'center' }}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main ── */}
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-4 pb-12 md:pb-24">

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded border text-sm shadow-sm" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: C.error }}>
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

          {/* ─── LEFT: Checkout Forms ─── */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            {/* Mobile Order Summary accordion (mobile only) */}
            <MobileOrderSummary
              items={items}
              total={total}
              subtotal={subtotal}
              packagingTotal={packagingTotal}
              shippingCost={shippingCost}
              cartDiscount={cartDiscount}
              offerDiscount={offerDiscount}
              isGiftWrapped={isGiftWrapped}
              selectedGiftPrice={selectedGiftPrice}
              settings={settings}
              isFreeShipping={isFreeShipping}
              freeShippingProgress={freeShippingProgress}
              amountToFreeShipping={amountToFreeShipping}
              getImageUrl={getImageUrl}
              formatPrice={formatPrice}
            />

            {/* ── Section 1: Customer Selection ── */}
            <SectionCard num="1" title="Account Preference">
              {checkoutMode === 'auth_entry' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Existing Customer */}
                  <div className="flex flex-col p-5 rounded-md border bg-white h-full" style={{ borderColor: C.border }}>
                    <div className="mb-4">
                      <span className="material-symbols-outlined text-[20px]" style={{ color: C.navyLight }}>login</span>
                    </div>
                    <div className="text-[13px] font-bold tracking-wide uppercase mb-1" style={{ color: C.navy }}>Existing Customer</div>
                    <div className="text-[11px] mb-4 flex-grow" style={{ color: C.navyLight }}>Sign in to continue</div>
                    <Link
                      to="/login"
                      state={{ from: { pathname: '/checkout' } }}
                      className="w-full text-center py-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
                      style={{ backgroundColor: C.inputBg, color: C.navy, border: `1px solid ${C.border}` }}
                    >
                      SIGN IN
                    </Link>
                  </div>

                  {/* New Customer */}
                  <div className="flex flex-col p-5 rounded-md border bg-white h-full" style={{ borderColor: C.border }}>
                    <div className="mb-4">
                      <span className="material-symbols-outlined text-[20px]" style={{ color: C.navyLight }}>person_add</span>
                    </div>
                    <div className="text-[13px] font-bold tracking-wide uppercase mb-1" style={{ color: C.navy }}>New Customer</div>
                    <div className="text-[11px] mb-4 flex-grow" style={{ color: C.navyLight }}>Create an account</div>
                    <Link
                      to="/register"
                      state={{ from: { pathname: '/checkout' } }}
                      className="w-full text-center py-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
                      style={{ backgroundColor: C.inputBg, color: C.navy, border: `1px solid ${C.border}` }}
                    >
                      REGISTER
                    </Link>
                  </div>

                  {/* Continue as Guest */}
                  <div
                    onClick={() => setCheckoutMode('guest')}
                    className="flex flex-col p-5 rounded-md border cursor-pointer h-full transition-colors relative"
                    style={{ borderColor: C.goldBorder, backgroundColor: C.inputBg }}
                  >
                    <div className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1" style={{ backgroundColor: C.goldBg, color: C.goldDark, border: `1px solid ${C.goldBorder}` }}>
                      <span className="material-symbols-outlined text-[10px]">check</span> SELECTED
                    </div>
                    <div className="mb-4">
                      <span className="material-symbols-outlined text-[20px]" style={{ color: C.goldDark }}>person</span>
                    </div>
                    <div className="text-[13px] font-bold tracking-wide uppercase mb-1" style={{ color: C.navy }}>Continue as Guest</div>
                    <div className="text-[11px] mb-4 flex-grow" style={{ color: C.navyLight }}>Checkout without creating an account</div>
                  </div>
                </div>
              ) : checkoutMode === 'guest' ? (
                <div>
                  <div className="flex items-center justify-between p-4 rounded-md border" style={{ borderColor: C.goldBorder, backgroundColor: C.inputBg }}>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[20px]" style={{ color: C.goldDark }}>person</span>
                      <div>
                         <div className="text-[13px] font-bold tracking-wide uppercase" style={{ color: C.navy }}>Continue as Guest</div>
                         <div className="text-[11px]" style={{ color: C.navyLight }}>Checkout without creating an account</div>
                      </div>
                    </div>
                    <button onClick={() => setCheckoutMode('auth_entry')} className="text-[10px] font-bold uppercase tracking-widest hover:underline" style={{ color: C.goldDark }}>CHANGE</button>
                  </div>
                </div>
              ) : (
                /* Authenticated user */
                <div className="flex items-center gap-3 p-4 rounded-md border" style={{ borderColor: C.goldBorder, backgroundColor: C.inputBg }}>
                  <span className="material-symbols-outlined text-[20px]" style={{ color: C.goldDark }}>verified_user</span>
                  <div className="flex-grow">
                    <div className="text-[13px] font-bold tracking-wide uppercase" style={{ color: C.navy }}>
                      {user ? `${user.firstName} ${user.lastName || ''}` : 'Signed in'}
                    </div>
                    {user?.email && <div className="text-[11px]" style={{ color: C.navyLight }}>{user.email}</div>}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded" style={{ backgroundColor: C.goldBg, color: C.goldDark, border: `1px solid ${C.goldBorder}` }}>MEMBER</span>
                </div>
              )}
            </SectionCard>

            {/* ── Section 2: Contact Information (Guest only) ── */}
            {checkoutMode === 'guest' && (
              <SectionCard num="2" title="Contact Information" badge="QUICK GUEST DETAILS">
                <p className="text-[11px] mb-5" style={{ color: C.navyLight }}>Your order confirmation, receipt, and shipping updates will be delivered to these coordinates.</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>EMAIL ADDRESS <span style={{ color: C.error }}>*</span></label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={handleEmailChange}
                        onBlur={handleEmailBlur}
                        placeholder="name@example.com"
                        className={inputCls}
                        style={{ 
                          backgroundColor: C.inputBg,
                          borderColor: formErrors.email ? C.error : C.border 
                        }}
                      />
                      {formErrors.email && (
                        <p className="text-[11px] mt-1.5" style={{ color: C.error }}>{formErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelCls}>PHONE NUMBER <span style={{ color: C.error }}>*</span></label>
                      <div className="flex">
                        <div className="flex items-center justify-center px-4 rounded-l-lg border-y border-l text-sm font-medium shrink-0 transition-colors" style={{ borderColor: formErrors.phone ? C.error : C.border, backgroundColor: 'white', color: C.navy }}>+91</div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={guestAddress.phone}
                          onChange={handlePhoneChange}
                          onBlur={handlePhoneBlur}
                          placeholder="98765 43210"
                          className={`${inputCls} rounded-l-none rounded-r-lg border-l-0`}
                          style={{ 
                            backgroundColor: C.inputBg,
                            borderColor: formErrors.phone ? C.error : C.border
                          }}
                        />
                      </div>
                      {formErrors.phone && (
                        <p className="text-[11px] mt-1.5" style={{ color: C.error }}>{formErrors.phone}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>FULL NAME <span style={{ color: C.error }}>*</span></label>
                    <input
                      type="text"
                      value={guestAddress.fullName}
                      onChange={(e) => setGuestAddress({ ...guestAddress, fullName: e.target.value })}
                      placeholder="Enter your full name"
                      className={inputCls}
                      style={{ backgroundColor: C.inputBg }}
                    />
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── Section 3/2: Delivery Address ── */}
            {(checkoutMode === 'guest' || checkoutMode === 'user') && (
              <SectionCard
                num={checkoutMode === 'guest' ? '3' : '2'}
                title="Delivery Address"
                badge="PAN-INDIA DISPATCH"
              >
                <p className="text-[11px] mb-5" style={{ color: C.navyLight }}>Please provide the delivery destination for secure, temperature-safe packaging.</p>
                {checkoutMode === 'guest' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>FULL NAME <span style={{ color: C.error }}>*</span></label>
                        <input
                          type="text"
                          value={guestAddress.fullName}
                          onChange={(e) => setGuestAddress({ ...guestAddress, fullName: e.target.value })}
                          placeholder="Name"
                          className={inputCls}
                          style={{ backgroundColor: C.inputBg }}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>PIN CODE <span style={{ color: C.error }}>*</span></label>
                        <input
                          type="text"
                          value={guestAddress.postalCode}
                          onChange={(e) => setGuestAddress({ ...guestAddress, postalCode: e.target.value })}
                          placeholder="PIN Code"
                          className={inputCls}
                          style={{ backgroundColor: C.inputBg }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>ADDRESS LINE 1 <span className="normal-case font-normal tracking-normal text-[10px]" style={{ color: C.navyLight }}>(FLAT, HOUSE NO., BUILDING, STREET)</span> <span style={{ color: C.error }}>*</span></label>
                      <input
                        type="text"
                        value={guestAddress.addressLine1}
                        onChange={(e) => setGuestAddress({ ...guestAddress, addressLine1: e.target.value })}
                        placeholder=""
                        className={inputCls}
                        style={{ backgroundColor: C.inputBg }}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>ADDRESS LINE 2 <span className="normal-case font-normal tracking-normal text-[10px]" style={{ color: C.navyLight }}>(AREA, COLONY, LANDMARK)</span></label>
                      <input
                        type="text"
                        value={guestAddress.addressLine2}
                        onChange={(e) => setGuestAddress({ ...guestAddress, addressLine2: e.target.value })}
                        placeholder=""
                        className={inputCls}
                        style={{ backgroundColor: C.inputBg }}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>CITY <span style={{ color: C.error }}>*</span></label>
                        <input
                          type="text"
                          value={guestAddress.city}
                          onChange={(e) => setGuestAddress({ ...guestAddress, city: e.target.value })}
                          placeholder="City"
                          className={inputCls}
                          style={{ backgroundColor: C.inputBg }}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>STATE <span style={{ color: C.error }}>*</span></label>
                        <input
                          type="text"
                          value={guestAddress.state}
                          onChange={(e) => setGuestAddress({ ...guestAddress, state: e.target.value })}
                          placeholder="State"
                          className={inputCls}
                          style={{ backgroundColor: C.inputBg }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Authenticated address selection */
                  <div className="space-y-3">
                    {addresses.length > 0 ? addresses.map(addr => (
                      <div
                        key={addr.id}
                        className="flex items-start gap-4 p-5 rounded-md border cursor-pointer transition-colors"
                        style={{
                          borderColor: selectedAddressId === addr.id ? C.goldBorder : C.border,
                          backgroundColor: selectedAddressId === addr.id ? C.inputBg : 'white',
                        }}
                        onClick={() => setSelectedAddressId(addr.id)}
                      >
                        <div className="mt-0.5 relative flex items-center justify-center w-5 h-5 shrink-0">
                          <div className="w-4 h-4 rounded-full border flex items-center justify-center bg-white" style={{ borderColor: selectedAddressId === addr.id ? C.goldDark : C.border }}>
                            {selectedAddressId === addr.id && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.goldDark }} />}
                          </div>
                        </div>
                        <div className="flex-grow">
                          <div className="font-bold text-[13px] uppercase tracking-wide mb-1" style={{ color: C.navy }}>{addr.fullName}</div>
                          <div className="text-[12px] leading-relaxed" style={{ color: C.navyLight }}>
                            {addr.addressLine1}{addr.addressLine2 && `, ${addr.addressLine2}`}<br />
                            {addr.city}, {addr.state} {addr.postalCode}<br />
                            Phone: {addr.phone}
                          </div>
                        </div>
                        {selectedAddressId === addr.id && (
                          <button onClick={(e) => { e.stopPropagation(); setIsAddressModalOpen(true); }} className="text-[10px] font-bold uppercase tracking-widest hover:underline shrink-0" style={{ color: C.goldDark }}>EDIT</button>
                        )}
                      </div>
                    )) : (
                      <div className="text-center py-8 rounded-md border border-dashed bg-white" style={{ borderColor: C.border }}>
                        <p className="text-[12px] mb-3" style={{ color: C.navyLight }}>No saved addresses yet.</p>
                        <button onClick={() => setIsAddressModalOpen(true)} className="text-[10px] font-bold uppercase tracking-widest hover:underline" style={{ color: C.goldDark }}>ADD NEW ADDRESS</button>
                      </div>
                    )}
                    {addresses.length > 0 && (
                      <button onClick={() => setIsAddressModalOpen(true)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mt-4 hover:opacity-70 transition-opacity" style={{ color: C.navy }}>
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        ADD NEW ADDRESS
                      </button>
                    )}
                  </div>
                )}
              </SectionCard>
            )}

            {/* ── Section 3/4: Payment Method ── */}
            {(checkoutMode === 'guest' || checkoutMode === 'user') && (
              <SectionCard
                num={checkoutMode === 'guest' ? '4' : '3'}
                title="Payment Method"
              >
                {/* Razorpay Option */}
                <div className="flex items-center gap-4 p-5 rounded-md border" style={{ borderColor: C.goldBorder, backgroundColor: C.inputBg }}>
                   <div className="mt-0.5 relative flex items-center justify-center w-5 h-5 shrink-0">
                     <div className="w-4 h-4 rounded-full border flex items-center justify-center bg-white" style={{ borderColor: C.goldDark }}>
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.goldDark }} />
                     </div>
                   </div>
                  <div className="flex-grow">
                    <div className="text-[13px] font-bold tracking-wide uppercase" style={{ color: C.navy }}>Razorpay Secure Online</div>
                    <div className="text-[11px] mt-1" style={{ color: C.navyLight }}>Cards, UPI, Netbanking &amp; Wallets</div>
                  </div>
                  <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 bg-white border" style={{ borderColor: C.border }}>
                    <span className="material-symbols-outlined text-[20px]" style={{ color: C.navyLight }}>credit_card</span>
                  </div>
                </div>

                {/* Gift Wrap */}
                {settings?.isGiftWrapEnabled && (
                  <div className="mt-6 pt-6 border-t" style={{ borderColor: C.border }}>
                    <label className="flex items-start gap-4 cursor-pointer">
                      <div
                        className="mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors bg-white"
                        style={{ borderColor: isGiftWrapped ? C.goldDark : C.border, backgroundColor: isGiftWrapped ? C.goldDark : 'white' }}
                        onClick={() => setIsGiftWrapped(!isGiftWrapped)}
                      >
                        {isGiftWrapped && <span className="material-symbols-outlined text-[12px] text-white">check</span>}
                      </div>
                      <input type="checkbox" checked={isGiftWrapped} onChange={(e) => setIsGiftWrapped(e.target.checked)} className="sr-only" />
                      <div className="flex-grow">
                        <div className="text-[13px] font-bold tracking-wide uppercase" style={{ color: C.navy }}>Pack as Gift (+{formatPrice(settings.giftWrapPrice || 0)})</div>
                        <div className="text-[11px] mt-1" style={{ color: C.navyLight }}>Add signature artisanal wrapping</div>
                      </div>
                    </label>
                    {isGiftWrapped && (
                      <textarea
                        value={giftMessage || ''}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        placeholder="Gift Message (Optional)"
                        className="mt-4 w-full px-4 py-3 text-[12px] rounded-lg border outline-none resize-y min-h-[80px] focus:ring-1"
                        style={{ borderColor: C.border, color: C.navy, backgroundColor: C.inputBg, outlineColor: C.goldDark }}
                      />
                    )}
                  </div>
                )}

                {/* Order Notes */}
                <div className="mt-6 pt-6 border-t" style={{ borderColor: C.border }}>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: C.navy }}>
                    ORDER NOTES <span className="normal-case font-normal tracking-normal text-[10px] text-gray-500">(OPTIONAL)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions for delivery..."
                    className="w-full px-4 py-3 text-[12px] rounded-lg border outline-none resize-y min-h-[80px] focus:ring-1"
                    style={{ borderColor: C.border, color: C.navy, backgroundColor: C.inputBg, outlineColor: C.goldDark }}
                  />
                </div>
              </SectionCard>
            )}
            
            {/* Mobile bottom padding for sticky CTA */}
            <div className="h-28 lg:hidden" />
          </div>

          {/* ─── RIGHT: Sticky Order Summary (desktop) ─── */}
          <div className="lg:col-span-5 order-1 lg:order-2 hidden lg:block">
            <div className="sticky top-28 bg-white" style={{ borderTop: `4px solid ${C.goldDark}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div className="p-8">
                {/* Summary Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: C.border }}>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: C.goldDark }}>REVIEW ORDER</div>
                    <span className="text-2xl font-serif" style={{ color: C.navy }}>Order Summary</span>
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded" style={{ backgroundColor: C.inputBg, color: C.navyLight, border: `1px solid ${C.border}` }}>
                    {items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'}
                  </div>
                </div>
                <OrderSummaryContent />
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ── Mobile Sticky CTA ── */}
      {(checkoutMode === 'guest' || checkoutMode === 'user') && (
        <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden px-4 pb-safe bg-white border-t" style={{ borderColor: C.border, paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="py-3 flex items-center justify-between gap-4">
             <div className="flex flex-col">
               <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: C.navyLight }}>TOTAL (INCL. TAXES)</span>
               <span className="text-xl font-serif font-semibold" style={{ color: C.navy }}>{formatPrice(total)}</span>
             </div>
             <div className="flex-grow max-w-[200px]">
               <PayButton full={true} showPrice={false} />
             </div>
          </div>
        </div>
      )}

      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={fetchAddresses}
        editAddress={null}
      />
    </div>
  );
};

// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard: React.FC<{
  num: string;
  title: string;
  badge?: string;
  children: React.ReactNode;
}> = ({ num, title, badge, children }) => (
  <div className="mb-6 rounded-md border p-6 md:p-8 bg-white" style={{ borderColor: '#e8e0d0' }}>
    <div className="flex items-start md:items-center justify-between mb-6 flex-col md:flex-row gap-2">
      <h2 className="flex items-center gap-4 text-2xl font-serif" style={{ color: '#1c2533' }}>
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ backgroundColor: '#8b6914' }}>
          {num}
        </span>
        {title}
      </h2>
      {badge && (
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded" style={{ color: '#8b6914', backgroundColor: '#fdf8ee', border: '1px solid #e8e0d0' }}>
          {badge}
        </span>
      )}
    </div>
    {children}
  </div>
);

// ─── Mobile Order Summary ─────────────────────────────────────────────────────
const MobileOrderSummary: React.FC<{
  items: any[];
  total: number;
  subtotal: number;
  packagingTotal: number;
  shippingCost: number;
  cartDiscount: number;
  offerDiscount: number;
  isGiftWrapped: boolean;
  selectedGiftPrice: number;
  settings: any;
  isFreeShipping: boolean;
  freeShippingProgress: number;
  amountToFreeShipping: number;
  getImageUrl: (img: string) => string;
  formatPrice: (n: number) => string;
}> = ({
  items, total, subtotal, packagingTotal, shippingCost, cartDiscount, offerDiscount,
  isGiftWrapped, selectedGiftPrice, settings, isFreeShipping, freeShippingProgress,
  amountToFreeShipping, getImageUrl, formatPrice,
}) => {
  const [open, setOpen] = useState(false);
  const C = {
    bg: '#f9f8f6', card: '#ffffff', border: '#e8e0d0', navy: '#1c2533',
    navyLight: '#4a5568', gold: '#8b6914', goldBg: '#fdf8ee', goldBorder: '#c9a227',
    goldDark: '#755811', success: '#2f7a4a', error: '#c0392b', inputBg: '#fbfaf8'
  };

  return (
    <div className="lg:hidden mb-6 rounded-md border bg-white overflow-hidden" style={{ borderColor: C.border }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5"
      >
        <div className="flex items-center gap-3 font-serif text-lg" style={{ color: C.navy }}>
          <span className="material-symbols-outlined text-[20px]" style={{ color: C.goldDark }}>shopping_bag</span>
          Order Summary
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm" style={{ backgroundColor: C.inputBg, border: `1px solid ${C.border}`, color: C.navyLight }}>
             {items.length}
          </span>
          <span className="material-symbols-outlined text-base transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: C.navyLight }}>expand_more</span>
        </div>
        <span className="text-lg font-serif" style={{ color: C.navy }}>{formatPrice(total)}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: C.border }}>
          {/* Items */}
          <div className="space-y-4 mt-5 pb-5 border-b" style={{ borderColor: C.border }}>
            {items.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-16 h-16 rounded-md overflow-hidden shrink-0 border bg-white" style={{ borderColor: C.border }}>
                  {item.image ? (
                    <img className="w-full h-full object-cover" src={getImageUrl(item.image)} alt={item.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl" style={{ color: C.navyLight }}>image</span>
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="font-serif text-[17px]" style={{ color: C.navy }}>{item.name}</div>
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: C.navyLight }}>{item.size} • Concentrated Perfume Oil</div>
                  <div className="flex justify-between items-end mt-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.navyLight }}>QTY: {item.quantity}</div>
                    <div className="text-sm font-semibold" style={{ color: C.navy }}>
                      {formatPrice((item.finalPrice || 0) * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Free Shipping Progress */}
          <div className="my-5">
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

          {/* Price Breakdown */}
          <div className="space-y-3 text-xs mb-5 pb-5 border-b" style={{ borderColor: C.border }}>
            <div className="flex justify-between">
              <span style={{ color: C.navyLight }}>Subtotal</span>
              <span style={{ color: C.navy }}>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: C.navyLight }}>Packaging</span>
              <span className="uppercase" style={{ color: C.goldDark }}>{packagingTotal > 0 ? formatPrice(packagingTotal) : 'STANDARD (FREE)'}</span>
            </div>
            {isGiftWrapped && settings?.isGiftWrapEnabled && (
              <div className="flex justify-between">
                <span style={{ color: C.navyLight }}>Gift Wrapping</span>
                <span style={{ color: C.navy }}>{formatPrice(selectedGiftPrice)}</span>
              </div>
            )}
            {offerDiscount > 0 && (
              <div className="flex justify-between">
                <span style={{ color: C.goldDark }}>Product Discounts</span>
                <span style={{ color: C.goldDark }}>-{formatPrice(offerDiscount)}</span>
              </div>
            )}
            {cartDiscount > 0 && (
              <div className="flex justify-between">
                <span style={{ color: C.goldDark }}>Cart Discount</span>
                <span style={{ color: C.goldDark }}>-{formatPrice(cartDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span style={{ color: C.navyLight }}>Standard Shipping</span>
              <span style={{ color: shippingCost === 0 ? C.success : C.navy, fontWeight: shippingCost === 0 ? 600 : 400 }}>
                {shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center mt-5">
            <div>
              <span className="block text-base font-serif" style={{ color: C.navy }}>Total</span>
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: C.navyLight }}>INCLUDES ALL TAXES</span>
            </div>
            <span className="text-2xl font-serif" style={{ color: C.navy }}>{formatPrice(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
