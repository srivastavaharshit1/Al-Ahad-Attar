import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { usePromotions } from '../../context/PromotionContext';
import { formatPrice } from '../../utils/formatPrice';
import type { PromotionResponse } from '../../types/promotion';

// ── Design Tokens (warm luxury attar palette) ───────────────────────────────
const C = {
  bg: '#FAF8F2',
  card: '#FFFFFF',
  border: '#E9E0CF',
  navy: '#10243A',
  navyLight: '#4A5568',
  gold: '#A87908',
  goldBg: '#FDF8EE',
  goldBorder: '#C9A227',
  goldDark: '#755811',
  success: '#2F7A4A',
  successBg: '#F2F8F4',
  successBorder: '#A8D5B5',
  amber: '#C87E28',
  amberBg: '#FEF7ED',
  amberBorder: '#F0C070',
  burgundy: '#7A2630',
  burgundyBg: '#FDF7F8',
  burgundyBorder: '#E8B4C0',
  inputBg: '#FDFBF7',
  muted: '#8C98A4',
  cream: '#F5F2EA',
};

// ── Helper: discount label ───────────────────────────────────────────────────
function getDiscountLabel(promo: PromotionResponse): string {
  if (promo.promotionType === 'FREE_SHIPPING') return 'Free Shipping';
  if (promo.promotionType === 'FREE_PRODUCT') return 'Free Gift';
  if (promo.promotionType === 'FIRST_ORDER')
    return promo.discountType === 'PERCENTAGE'
      ? `${promo.discountValue}% off first order`
      : `₹${promo.discountValue} off first order`;
  if (promo.discountType === 'PERCENTAGE') return `${promo.discountValue}% OFF`;
  if (promo.discountType === 'FIXED_AMOUNT') return `₹${promo.discountValue} OFF`;
  return promo.name;
}

// ── Available Offers Drawer ──────────────────────────────────────────────────
interface OffersDrawerProps {
  promotions: PromotionResponse[];
  onApply: (code: string) => void;
  onClose: () => void;
}

const OffersDrawer: React.FC<OffersDrawerProps> = ({ promotions, onApply, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div
      className="mt-4 rounded-xl border overflow-hidden"
      style={{ borderColor: C.border, backgroundColor: C.card }}
    >
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: C.border, backgroundColor: C.goldBg }}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[15px]" style={{ color: C.goldDark }}>local_offer</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: C.goldDark }}>
            Available Offers
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[11px] font-semibold uppercase tracking-wide transition-opacity hover:opacity-70"
          style={{ color: C.navyLight }}
          aria-label="Close offers panel"
        >
          ✕ Close
        </button>
      </div>

      {promotions.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <span className="material-symbols-outlined text-[32px] mb-2 block" style={{ color: C.muted }}>
            hourglass_empty
          </span>
          <p className="text-[12px]" style={{ color: C.navyLight }}>
            No active offers at the moment. Check back soon.
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {promotions.map(promo => (
            <div key={promo.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {promo.code && (
                      <span
                        className="font-mono text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                        style={{ backgroundColor: C.goldBg, color: C.goldDark, border: `1px solid ${C.goldBorder}` }}
                      >
                        {promo.code}
                      </span>
                    )}
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: C.burgundyBg, color: C.burgundy, border: `1px solid ${C.burgundyBorder}` }}
                    >
                      {getDiscountLabel(promo)}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed mb-2" style={{ color: C.navy }}>
                    {promo.generatedDescription || promo.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {promo.minCartValue > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: C.navyLight, backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                        Min. ₹{promo.minCartValue}
                      </span>
                    )}
                    {promo.endDate && (
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: C.navyLight, backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                        Expires {new Date(promo.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {promo.code && (
                    <>
                      <button
                        onClick={() => handleCopy(promo.code!)}
                        className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded border transition-all"
                        style={{
                          color: copied === promo.code ? C.success : C.goldDark,
                          borderColor: copied === promo.code ? C.successBorder : C.goldBorder,
                          backgroundColor: copied === promo.code ? C.successBg : C.goldBg,
                        }}
                      >
                        {copied === promo.code ? '✓ Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => { onApply(promo.code!); onClose(); }}
                        className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded text-white transition-all hover:brightness-110"
                        style={{ backgroundColor: C.goldDark }}
                      >
                        Apply
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main PromotionsCard ──────────────────────────────────────────────────────
interface PromotionsCardProps {
  /** Inline style override for the outer wrapper */
  className?: string;
}

export const PromotionsCard: React.FC<PromotionsCardProps> = ({ className = '' }) => {
  const {
    couponCode,
    cartDiscount,
    appliedPromotions,
    unlockMessages,
    subtotal,
    offerDiscount,
    applyCoupon,
    removeCoupon,
    removePromotion,
  } = useCart();
  const { activePromotions } = usePromotions();

  const [couponInput, setCouponInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalAfterOffer = subtotal - offerDiscount;

  // ── Derive UI state ───────────────────────────────────────────────────────
  //
  // STATE_SUCCESS  : a promotion or coupon is applied (appliedPromotions not empty)
  // STATE_PROGRESS : no promotion applied yet, but backend says "spend ₹X more"
  // STATE_GUIDANCE : coupon is entered & valid, but cart conditions not met
  // STATE_DEFAULT  : nothing applied, nothing pending

  const hasApplied = appliedPromotions && appliedPromotions.length > 0;

  // Detect unlock messages from backend
  const spendMoreMsg = unlockMessages?.find(msg =>
    msg.toLowerCase().includes('spend') ||
    msg.toLowerCase().includes('add') ||
    msg.toLowerCase().includes('more')
  );
  const conditionMsg = unlockMessages?.find(msg =>
    msg.toLowerCase().includes('condition') ||
    msg.toLowerCase().includes('applicable') ||
    msg.toLowerCase().includes('eligible') ||
    msg.toLowerCase().includes('category') ||
    msg.toLowerCase().includes('product')
  );
  const invalidMsg = unlockMessages?.find(msg =>
    msg.toLowerCase().includes('invalid') ||
    msg.toLowerCase().includes('expired')
  );

  // For progress state: try to parse remaining amount from message
  // Message pattern (from backend): "Spend ₹302 more to unlock Offer"
  const parseRemainingAmount = (msg: string): number | null => {
    const match = msg.match(/₹([\d,]+)/);
    if (match) return parseInt(match[1].replace(',', ''));
    return null;
  };

  const remainingForOffer = spendMoreMsg ? parseRemainingAmount(spendMoreMsg) : null;

  // For progress bar: if we know minCartValue from an available/locked promotion
  const progressPromo = remainingForOffer != null
    ? activePromotions.find(p => p.minCartValue > 0)
    : null;
  const progressMin = progressPromo?.minCartValue ?? (remainingForOffer ? totalAfterOffer + remainingForOffer : 0);
  const progressPct = progressMin > 0 ? Math.min(100, Math.round((totalAfterOffer / progressMin) * 100)) : 0;

  // Determine display coupon code (from applied promo or from couponCode state)


  // Savings amount
  const savedAmount = cartDiscount;

  // Clear local error when unlockMessages changes
  useEffect(() => {
    if (invalidMsg) {
      setLocalError(invalidMsg);
    } else {
      setLocalError('');
    }
  }, [unlockMessages, invalidMsg]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleApply = async (codeOverride?: string) => {
    const code = (codeOverride ?? couponInput).trim().toUpperCase();
    if (!code) {
      inputRef.current?.focus();
      return;
    }
    setIsApplying(true);
    setLocalError('');
    try {
      await applyCoupon(code);
      setCouponInput('');
      setApplySuccess(true);
      setTimeout(() => setApplySuccess(false), 2000);
    } catch (err: any) {
      setLocalError(err.response?.data?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemove = async () => {
    const promo = appliedPromotions?.[0];
    if (promo?.code) {
      await removeCoupon();
    } else {
      await removePromotion();
    }
  };



  // ─────────────────────────────────────────────────────────────────────────
  // STATE 2 — COUPON APPLIED / SUCCESS
  // ─────────────────────────────────────────────────────────────────────────
  if (hasApplied) {
    const appliedPromo = appliedPromotions[0];
    return (
      <div className={className}>
        <State02Success appliedPromo={appliedPromo} handleRemove={handleRemove} savedAmount={savedAmount} activePromotions={activePromotions} />
        {showDrawer && <OffersDrawer promotions={activePromotions} onApply={handleApply} onClose={() => setShowDrawer(false)} />}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 3 — SPEND MORE TO UNLOCK (PROGRESS)
  // ─────────────────────────────────────────────────────────────────────────
  if (spendMoreMsg && !invalidMsg) {
    return (
      <div className={className}>
        <State03Progress spendMoreMsg={spendMoreMsg} couponInput={couponInput} setCouponInput={setCouponInput} handleApply={handleApply} isApplying={isApplying} progressPct={progressPct} totalAfterOffer={totalAfterOffer} progressMin={progressMin} showDrawer={showDrawer} setShowDrawer={setShowDrawer} activePromotions={activePromotions} />
        {showDrawer && <OffersDrawer promotions={activePromotions} onApply={handleApply} onClose={() => setShowDrawer(false)} />}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 4 — CONDITIONS NOT MET / GUIDANCE
  // ─────────────────────────────────────────────────────────────────────────
  if (conditionMsg && !invalidMsg) {
    const matchedPromo = couponCode ? activePromotions.find(p => p.code?.toUpperCase() === couponCode.toUpperCase()) : null;
    return (
      <div className={className}>
        <State04Guidance couponCode={couponCode} couponInput={couponInput} handleApply={handleApply} isApplying={isApplying} localError={localError} conditionMsg={conditionMsg} totalAfterOffer={totalAfterOffer} removeCoupon={removeCoupon} matchedPromo={matchedPromo} />
        {showDrawer && <OffersDrawer promotions={activePromotions} onApply={handleApply} onClose={() => setShowDrawer(false)} />}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 1 — DEFAULT / EMPTY
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={className}>
      <State01Default couponInput={couponInput} setCouponInput={setCouponInput} handleApply={handleApply} isApplying={isApplying} localError={localError} activePromotions={activePromotions} showDrawer={showDrawer} setShowDrawer={setShowDrawer} applySuccess={applySuccess} />
      {showDrawer && <OffersDrawer promotions={activePromotions} onApply={handleApply} onClose={() => setShowDrawer(false)} />}
    </div>
  );
};

// ── Exported States for Offers UI Demo ───────────────────────────────────────
export const State01Default = ({ couponInput, setCouponInput, handleApply, isApplying, localError, activePromotions, showDrawer, setShowDrawer, applySuccess }: any) => {
  return (
    <div className="rounded-[18px] border overflow-hidden w-full flex flex-col justify-between" style={{ borderColor: C.border, backgroundColor: C.card, boxShadow: '0 4px 20px rgba(16, 36, 58, 0.03)' }}>
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]" style={{ color: C.goldDark }}>local_fire_department</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: C.navy, letterSpacing: '0.15em' }}>Promotions &amp; Offers</span>
          </div>
          <span className="text-[11px]" style={{ color: C.navyLight }}>Festive Sale Live</span>
        </div>
        <div className={`flex items-center rounded-full overflow-hidden transition-all duration-300 mb-4 shadow-[0_2px_15px_rgba(0,0,0,0.03)] ${localError ? 'ring-2 ring-[#c0392b]' : 'ring-1 ring-transparent focus-within:ring-2 focus-within:ring-[#C9A227]'}`} style={{ backgroundColor: '#ffffff' }}>
          <span className="pl-5 material-symbols-outlined text-[18px]" style={{ color: C.muted }}>local_offer</span>
          <input type="text" value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleApply()} placeholder="ENTER DISCOUNT CODE" className="flex-grow px-4 py-3.5 text-[12px] font-semibold tracking-wider uppercase outline-none bg-transparent border-none focus:ring-0 focus:border-transparent focus:outline-none" style={{ color: C.navy }} disabled={isApplying} />
          <button onClick={() => handleApply()} disabled={!couponInput.trim() || isApplying} className="mr-2 px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-full transition-all hover:brightness-110 disabled:opacity-40" style={{ color: C.navy, backgroundColor: C.border }}>
            {isApplying ? '...' : applySuccess ? '✓' : 'Apply'}
          </button>
        </div>
        {localError && <p className="text-[11px] mt-1 mb-3 pl-1" style={{ color: '#c0392b' }}>{localError}</p>}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4" style={{ backgroundColor: C.cream }}>
          <span className="material-symbols-outlined text-[14px]" style={{ color: C.goldDark }}>info</span>
          <p className="text-[11px]" style={{ color: C.navy }}>Have a discount code? Enter above to unlock special savings.</p>
          {activePromotions && activePromotions.length > 0 && (
            <div className="ml-auto flex items-center gap-1 cursor-pointer shrink-0" onClick={() => setShowDrawer(!showDrawer)}>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.goldDark }}>Offers ({activePromotions.length})</span>
              <span className="material-symbols-outlined text-[14px]" style={{ color: C.goldDark }}>{showDrawer ? 'expand_less' : 'chevron_right'}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={() => setShowDrawer(!showDrawer)} className="text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider" style={{ color: C.burgundy }}>
            View available offers <span className="material-symbols-outlined text-[14px]">{showDrawer ? 'expand_less' : 'chevron_right'}</span>
          </button>
          <span className="text-[11px] italic font-serif" style={{ color: C.navyLight }}>Save on the Finest Fragrances</span>
        </div>
      </div>
    </div>
  );
};

export const State02Success = ({ appliedPromo, handleRemove, savedAmount }: any) => {
  return (
    <div className="rounded-[18px] border overflow-hidden w-full flex flex-col justify-between" style={{ borderColor: C.border, backgroundColor: C.card, boxShadow: '0 4px 20px rgba(16, 36, 58, 0.03)' }}>
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]" style={{ color: C.goldDark }}>local_fire_department</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: C.navy, letterSpacing: '0.15em' }}>Promotions &amp; Offers</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ color: C.success, backgroundColor: C.successBg, border: `1px solid ${C.successBorder}` }}>Active Discount</span>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 rounded-full mb-4" style={{ border: `1px solid ${C.border}`, backgroundColor: C.inputBg }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px]" style={{ color: C.success }}>check_circle</span>
            <span className="font-mono text-[13px] font-bold uppercase tracking-wider" style={{ color: C.navy }}>{appliedPromo?.code || appliedPromo?.name || 'OFFER'}</span>
          </div>
          <button onClick={handleRemove} className="text-[10px] font-bold uppercase tracking-widest transition-opacity hover:opacity-70" style={{ color: C.burgundy }}>Remove</button>
        </div>
        <div className="px-5 py-4 rounded-xl mb-4" style={{ backgroundColor: C.goldBg, border: `1px solid ${C.goldBorder}` }}>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="material-symbols-outlined text-[18px]" style={{ color: C.goldDark }}>check_circle</span>
            <span className="font-mono text-[12px] font-bold uppercase tracking-wider" style={{ color: C.navy }}>{appliedPromo?.code || appliedPromo?.name || 'OFFER'}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded" style={{ backgroundColor: C.burgundy, color: '#fff' }}>Applied</span>
          </div>
          <p className="text-[12px] pl-8" style={{ color: C.navy }}>
            {appliedPromo?.generatedDescription || 'Festive bonus applied'} - You saved <span className="font-bold" style={{ color: C.burgundy }}>{formatPrice(savedAmount || 0)}</span> on your order!
          </p>
        </div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]" style={{ color: C.goldDark }}>card_giftcard</span>
            <span className="text-[11px]" style={{ color: C.navy }}>Enjoy your special savings!</span>
          </div>
          <span className="text-[11px] font-serif italic flex items-center gap-1" style={{ color: C.success }}>
            <span className="material-symbols-outlined text-[14px]">verified</span> Verified
          </span>
        </div>
      </div>
    </div>
  );
};

export const State03Progress = ({ spendMoreMsg, couponInput, setCouponInput, handleApply, isApplying, progressPct, totalAfterOffer, progressMin, showDrawer, setShowDrawer }: any) => {
  return (
    <div className="rounded-[18px] border overflow-hidden w-full flex flex-col justify-between" style={{ borderColor: C.border, backgroundColor: C.card, boxShadow: '0 4px 20px rgba(16, 36, 58, 0.03)' }}>
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]" style={{ color: C.goldDark }}>local_fire_department</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: C.navy, letterSpacing: '0.15em' }}>Promotions &amp; Offers</span>
          </div>
          <span className="text-[11px]" style={{ color: C.navyLight }}>Special Offer</span>
        </div>
        <div className="flex items-center rounded-full overflow-hidden transition-all duration-300 mb-4 shadow-[0_2px_15px_rgba(0,0,0,0.03)] ring-1 ring-transparent focus-within:ring-2 focus-within:ring-[#C9A227]" style={{ backgroundColor: '#ffffff' }}>
          <span className="pl-5 material-symbols-outlined text-[18px]" style={{ color: C.muted }}>local_offer</span>
          <input type="text" value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleApply()} placeholder="ENTER DISCOUNT CODE" className="flex-grow px-4 py-3.5 text-[12px] font-semibold tracking-wider uppercase outline-none bg-transparent border-none focus:ring-0 focus:border-transparent focus:outline-none" style={{ color: C.navy }} disabled={isApplying} />
          <button onClick={() => handleApply()} disabled={!couponInput.trim() || isApplying} className="mr-2 px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-full transition-all hover:brightness-110 disabled:opacity-40" style={{ color: '#fff', backgroundColor: C.goldDark }}>
            {isApplying ? '...' : 'Apply'}
          </button>
        </div>
        <div className="mb-4 pt-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]" style={{ color: C.goldDark }}>card_giftcard</span>
              <span className="text-[12px] font-semibold" style={{ color: C.navy }}>{spendMoreMsg}</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.goldDark }}>{progressPct}% Unlocked</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: C.cream }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPct}%`, background: `linear-gradient(to right, ${C.gold}, ${C.goldDark})` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] px-1" style={{ color: C.navyLight }}>
            <span>Current: {formatPrice(totalAfterOffer)}</span>
            <span>Target: {formatPrice(progressMin)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={() => setShowDrawer(!showDrawer)} className="text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider" style={{ color: C.burgundy }}>
            View all festive offers <span className="material-symbols-outlined text-[14px]">{showDrawer ? 'expand_less' : 'chevron_right'}</span>
          </button>
          <span className="text-[11px] italic font-serif" style={{ color: C.navyLight }}>The More You Shop, The More You Save</span>
        </div>
      </div>
    </div>
  );
};

export const State04Guidance = ({ couponCode, couponInput, handleApply, isApplying, localError, conditionMsg, totalAfterOffer, removeCoupon, matchedPromo }: any) => {
  return (
    <div className="rounded-[18px] border overflow-hidden w-full flex flex-col justify-between" style={{ borderColor: C.border, backgroundColor: C.card, boxShadow: '0 4px 20px rgba(16, 36, 58, 0.03)' }}>
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]" style={{ color: C.goldDark }}>local_fire_department</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: C.navy, letterSpacing: '0.15em' }}>Promotions &amp; Offers</span>
          </div>
          <span className="text-[11px]" style={{ color: C.burgundy }}>Requires Attention</span>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 rounded-full mb-4" style={{ border: `1px solid ${C.burgundyBorder}`, backgroundColor: C.inputBg }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px]" style={{ color: C.burgundy }}>info</span>
            <span className="font-mono text-[13px] font-bold uppercase tracking-wider" style={{ color: C.navy }}>{couponCode || couponInput || 'INVALID CODE'}</span>
          </div>
          <button onClick={() => handleApply()} disabled={isApplying} className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-full transition-opacity hover:opacity-70" style={{ color: '#fff', backgroundColor: C.goldDark }}>Apply</button>
        </div>
        <div className="px-5 py-4 rounded-xl mb-4 flex gap-3 items-start" style={{ backgroundColor: C.cream, border: `1px solid ${C.border}` }}>
          <span className="material-symbols-outlined text-[18px] mt-0.5" style={{ color: C.burgundy }}>warning</span>
          <div>
            <p className="text-[12px] font-bold mb-1 uppercase" style={{ color: C.navy }}>COUPON '{couponCode || couponInput}' IS INVALID.</p>
            <p className="text-[11px] mb-2" style={{ color: C.navyLight }}>Please check the code and try again, or view our available offers.</p>
            <ul className="space-y-1">
              {(localError || conditionMsg) && <li className="text-[11px]" style={{ color: C.navy }}>• {localError || conditionMsg}</li>}
              {matchedPromo?.minCartValue > 0 && <li className="text-[11px]" style={{ color: C.navy }}>• Min. cart value {formatPrice(matchedPromo.minCartValue)} (Current: {formatPrice(totalAfterOffer)})</li>}
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={() => { removeCoupon(); }} className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.burgundy }}>Try another code</button>
          <span className="text-[11px] italic font-serif flex items-center gap-1" style={{ color: C.navyLight }}>Need help? <Link to="/contact" className="underline">Contact Support</Link></span>
        </div>
      </div>
    </div>
  );
};
