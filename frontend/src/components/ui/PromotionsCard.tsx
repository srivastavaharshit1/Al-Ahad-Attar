import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { usePromotions } from '../../context/PromotionContext';
import { formatPrice } from '../../utils/formatPrice';
import type { PromotionResponse } from '../../types/promotion';

// ── Design Tokens (warm luxury attar palette) ───────────────────────────────
const C = {
  bg: '#faf6f0',
  card: '#ffffff',
  border: '#e8ddc8',
  navy: '#1c2533',
  navyLight: '#4a5568',
  gold: '#8b6914',
  goldBg: '#fdf8ee',
  goldBorder: '#c9a227',
  goldDark: '#755811',
  success: '#2f7a4a',
  successBg: '#f0faf4',
  successBorder: '#a8d5b5',
  amber: '#c87e28',
  amberBg: '#fef7ed',
  amberBorder: '#f0c070',
  burgundy: '#721c38',
  burgundyBg: '#fdf2f5',
  burgundyBorder: '#e8b4c0',
  inputBg: '#fbfaf8',
  muted: '#9ca3af',
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

  const cardHeader = (badge?: React.ReactNode) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px]" style={{ color: C.goldDark }}>
          redeem
        </span>
        <span
          className="text-[9px] font-bold uppercase tracking-[0.25em]"
          style={{ color: C.goldDark }}
        >
          Promotions &amp; Offers
        </span>
      </div>
      {badge}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 2 — COUPON APPLIED / SUCCESS
  // ─────────────────────────────────────────────────────────────────────────
  if (hasApplied) {
    const appliedPromo = appliedPromotions[0];
    return (
      <div
        className={`rounded-2xl border overflow-hidden ${className}`}
        style={{ borderColor: C.border, backgroundColor: C.card }}
      >
        <div className="px-5 pt-5 pb-4">
          {cardHeader(
            <span
              className="text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full"
              style={{ color: C.success, backgroundColor: C.successBg, border: `1px solid ${C.successBorder}` }}
            >
              Active Discount
            </span>
          )}

          {/* Applied code row */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
            style={{ backgroundColor: C.successBg, border: `1px solid ${C.successBorder}` }}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px]" style={{ color: C.success }}>
                check_circle
              </span>
              <span
                className="font-mono text-[13px] font-bold uppercase tracking-wider"
                style={{ color: C.navy }}
              >
                {appliedPromo.code || appliedPromo.name}
              </span>
            </div>
            <button
              onClick={handleRemove}
              className="text-[10px] font-bold uppercase tracking-wider transition-opacity hover:opacity-70"
              style={{ color: C.navyLight }}
              aria-label="Remove coupon"
            >
              Remove
            </button>
          </div>

          {/* Savings summary */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ backgroundColor: C.goldBg, border: `1px solid ${C.goldBorder}` }}
          >
            <div>
              <p className="text-[11px] font-semibold mb-0.5" style={{ color: C.goldDark }}>
                {appliedPromo.generatedDescription || getDiscountLabel(appliedPromo)}
              </p>
              {savedAmount > 0 && (
                <p className="text-[12px] font-bold" style={{ color: C.navy }}>
                  You saved{' '}
                  <span style={{ color: C.goldDark }}>{formatPrice(savedAmount)}</span>
                </p>
              )}
            </div>
            {savedAmount > 0 && (
              <span
                className="text-[18px] font-serif font-bold"
                style={{ color: C.goldDark }}
              >
                −{formatPrice(savedAmount)}
              </span>
            )}
          </div>

          {/* Additional benefits from other applied promotions */}
          {appliedPromotions.slice(1).map((p: any) => (
            <div
              key={p.id}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl border text-[11px]"
              style={{ borderColor: C.border, color: C.navyLight }}
            >
              <span className="material-symbols-outlined text-[14px]" style={{ color: C.goldDark }}>
                redeem
              </span>
              {p.name} also applied
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 3 — SPEND MORE TO UNLOCK (PROGRESS)
  // ─────────────────────────────────────────────────────────────────────────
  if (spendMoreMsg && !invalidMsg) {
    return (
      <div
        className={`rounded-2xl border overflow-hidden ${className}`}
        style={{ borderColor: C.border, backgroundColor: C.card }}
      >
        <div className="px-5 pt-5 pb-4">
          {cardHeader(
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: C.amber }}>
              Almost There
            </span>
          )}

          {/* Coupon input row */}
          <div
            className="flex items-center rounded-full overflow-hidden mb-4"
            style={{ border: `1.5px solid ${C.border}`, backgroundColor: C.inputBg }}
          >
            <span className="pl-4 material-symbols-outlined text-[16px]" style={{ color: C.muted }}>
              confirmation_number
            </span>
            <input
              ref={inputRef}
              type="text"
              value={couponInput}
              onChange={e => { setCouponInput(e.target.value.toUpperCase()); setLocalError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleApply()}
              placeholder="ENTER DISCOUNT CODE"
              className="flex-grow px-3 py-3 text-[11px] font-semibold tracking-wider uppercase outline-none bg-transparent"
              style={{ color: C.navy }}
              disabled={isApplying}
              aria-label="Discount code input"
            />
            <button
              onClick={() => handleApply()}
              disabled={!couponInput.trim() || isApplying}
              className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest transition-all hover:brightness-110 disabled:opacity-40"
              style={{ color: C.goldDark, backgroundColor: C.goldBg }}
              aria-label="Apply coupon"
            >
              {isApplying ? '...' : 'Apply'}
            </button>
          </div>

          {/* Progress message */}
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl mb-3"
            style={{ backgroundColor: C.amberBg, border: `1px solid ${C.amberBorder}` }}
          >
            <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0" style={{ color: C.amber }}>
              timer
            </span>
            <div>
              <p className="text-[12px] leading-snug" style={{ color: C.navy }}>
                {spendMoreMsg}
              </p>
              {remainingForOffer != null && (
                <p className="text-[11px] mt-1" style={{ color: C.navyLight }}>
                  Cart: {formatPrice(totalAfterOffer)}
                </p>
              )}
            </div>
            {remainingForOffer != null && (
              <span
                className="ml-auto text-[10px] font-bold uppercase tracking-wider shrink-0"
                style={{ color: C.amber }}
              >
                {progressPct}% Unlocked
              </span>
            )}
          </div>

          {/* Progress bar */}
          {progressMin > 0 && (
            <div
              className="w-full h-1.5 rounded-full overflow-hidden mb-3"
              style={{ backgroundColor: C.border }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: `linear-gradient(to right, ${C.gold}, ${C.goldDark})`,
                }}
              />
            </div>
          )}

          {/* View offers */}
          <button
            onClick={() => setShowDrawer(v => !v)}
            className="flex items-center gap-1 text-[11px] font-semibold transition-opacity hover:opacity-70 mt-1"
            style={{ color: C.goldDark }}
          >
            View festive tier benefits
            <span className="material-symbols-outlined text-[14px]">
              {showDrawer ? 'expand_less' : 'chevron_right'}
            </span>
          </button>

          {showDrawer && (
            <OffersDrawer
              promotions={activePromotions}
              onApply={handleApply}
              onClose={() => setShowDrawer(false)}
            />
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 4 — CONDITIONS NOT MET / GUIDANCE
  // ─────────────────────────────────────────────────────────────────────────
  if (conditionMsg && !invalidMsg) {
    // Try to find the promo associated with the entered coupon code
    const matchedPromo = couponCode
      ? activePromotions.find(p => p.code?.toUpperCase() === couponCode.toUpperCase())
      : null;

    return (
      <div
        className={`rounded-2xl border overflow-hidden ${className}`}
        style={{ borderColor: C.border, backgroundColor: C.card }}
      >
        <div className="px-5 pt-5 pb-4">
          {cardHeader(
            <span
              className="text-[9px] font-bold uppercase tracking-[0.2em]"
              style={{ color: C.burgundy }}
            >
              Requires Attention
            </span>
          )}

          {/* Coupon input row */}
          <div
            className="flex items-center rounded-full overflow-hidden mb-4"
            style={{ border: `1.5px solid ${C.goldBorder}`, backgroundColor: C.inputBg }}
          >
            <span className="pl-4 material-symbols-outlined text-[16px]" style={{ color: C.goldDark }}>
              confirmation_number
            </span>
            <span
              className="flex-grow px-3 py-3 text-[12px] font-bold tracking-wider uppercase"
              style={{ color: C.navy }}
            >
              {couponCode || couponInput}
            </span>
            <button
              onClick={() => handleApply()}
              disabled={isApplying}
              className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest transition-all hover:brightness-110 text-white"
              style={{ backgroundColor: C.goldDark }}
              aria-label="Retry coupon"
            >
              Apply
            </button>
          </div>

          {/* Condition guidance panel */}
          <div
            className="px-4 py-4 rounded-xl mb-3"
            style={{ backgroundColor: C.burgundyBg, border: `1px solid ${C.burgundyBorder}` }}
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0" style={{ color: C.burgundy }}>
                info
              </span>
              <p className="text-[12px] leading-snug" style={{ color: C.navy }}>
                <span className="font-bold">
                  {couponCode ? `Coupon '${couponCode}' is valid,` : 'Coupon is valid,'}
                </span>{' '}
                but cart conditions are not yet met.
              </p>
            </div>
            <ul className="space-y-1.5 pl-8">
              {matchedPromo?.minCartValue && matchedPromo.minCartValue > 0 && (
                <li className="text-[11px]" style={{ color: C.navyLight }}>
                  • Minimum cart value:{' '}
                  <span className="font-semibold" style={{ color: C.navy }}>
                    {formatPrice(matchedPromo.minCartValue)}
                  </span>{' '}
                  <span style={{ color: C.navyLight }}>
                    (Current: {formatPrice(totalAfterOffer)})
                  </span>
                </li>
              )}
              {conditionMsg && (
                <li className="text-[11px]" style={{ color: C.navyLight }}>
                  • {conditionMsg}
                </li>
              )}
              {matchedPromo?.configuration?.applicableCategoryIds?.length! > 0 && (
                <li className="text-[11px]" style={{ color: C.navyLight }}>
                  • Applicable on qualifying product categories
                </li>
              )}
            </ul>
          </div>

          {/* View eligible items CTA */}
          <div className="flex items-center justify-between">
            <p className="text-[11px]" style={{ color: C.navyLight }}>
              Want to see qualifying products?
            </p>
            <Link
              to="/collection"
              className="text-[11px] font-bold flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: C.goldDark }}
            >
              View Eligible Items
              <span className="material-symbols-outlined text-[13px]">chevron_right</span>
            </Link>
          </div>

          {/* Try another code */}
          <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: C.border }}>
            <button
              onClick={() => { setCouponInput(couponCode || ''); removeCoupon(); }}
              className="text-[11px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: C.navyLight }}
            >
              Try another code
            </button>
            <button
              onClick={() => setShowDrawer(v => !v)}
              className="text-[11px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: C.goldDark }}
            >
              View offers
              <span className="material-symbols-outlined text-[13px]">
                {showDrawer ? 'expand_less' : 'chevron_right'}
              </span>
            </button>
          </div>

          {showDrawer && (
            <OffersDrawer
              promotions={activePromotions}
              onApply={handleApply}
              onClose={() => setShowDrawer(false)}
            />
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE 1 — DEFAULT / EMPTY
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className={`rounded-2xl border overflow-hidden ${className}`}
      style={{ borderColor: C.border, backgroundColor: C.card }}
    >
      <div className="px-5 pt-5 pb-4">
        {cardHeader()}

        {/* Pill-shaped input */}
        <div
          className="flex items-center rounded-full overflow-hidden transition-shadow focus-within:shadow-sm"
          style={{
            border: `1.5px solid ${localError ? '#c0392b' : C.border}`,
            backgroundColor: C.inputBg,
          }}
        >
          <span className="pl-4 material-symbols-outlined text-[16px]" style={{ color: C.muted }}>
            confirmation_number
          </span>
          <input
            ref={inputRef}
            id="promo-code-input"
            type="text"
            value={couponInput}
            onChange={e => { setCouponInput(e.target.value.toUpperCase()); setLocalError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
            placeholder="Enter discount code"
            className="flex-grow px-3 py-3 text-[11px] font-semibold tracking-wider uppercase outline-none bg-transparent"
            style={{ color: C.navy }}
            disabled={isApplying}
            aria-label="Discount code input"
            aria-describedby={localError ? 'promo-error' : undefined}
          />
          <button
            onClick={() => handleApply()}
            disabled={!couponInput.trim() || isApplying}
            className="mr-1 px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              color: applySuccess ? C.success : C.goldDark,
              backgroundColor: applySuccess ? C.successBg : C.goldBg,
            }}
            aria-label="Apply coupon code"
          >
            {isApplying ? (
              <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
            ) : applySuccess ? (
              '✓'
            ) : (
              'Apply'
            )}
          </button>
        </div>

        {/* Error message */}
        {localError && (
          <p id="promo-error" className="text-[11px] mt-2 pl-1" style={{ color: '#c0392b' }}>
            {localError}
          </p>
        )}

        {/* Helper row */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-[11px]" style={{ color: C.navyLight }}>
            Have an attar connoisseur code? Enter above.
          </p>
          {activePromotions.length > 0 && (
            <button
              onClick={() => setShowDrawer(v => !v)}
              className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5 transition-opacity hover:opacity-70"
              style={{ color: C.goldDark }}
              aria-label="View available offers"
            >
              Offers ({activePromotions.length})
              <span className="material-symbols-outlined text-[13px]">
                {showDrawer ? 'expand_less' : 'chevron_right'}
              </span>
            </button>
          )}
        </div>

        {/* View available offers text-link */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: C.border }}>
          <Link
            to="/offers"
            className="flex items-center gap-1 text-[11px] font-semibold transition-opacity hover:opacity-70"
            style={{ color: C.goldDark }}
          >
            View available offers
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </Link>
          <span className="text-[10px]" style={{ color: C.muted }}>
            Up to {activePromotions.length > 0 ? `${activePromotions.length} offer${activePromotions.length !== 1 ? 's' : ''}` : 'offers'} available
          </span>
        </div>

        {/* Inline drawer */}
        {showDrawer && (
          <OffersDrawer
            promotions={activePromotions}
            onApply={handleApply}
            onClose={() => setShowDrawer(false)}
          />
        )}
      </div>
    </div>
  );
};
