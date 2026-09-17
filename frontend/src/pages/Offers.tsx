import React, { useState } from 'react';
import { useCart } from '../hooks/useCart';
import { usePromotions } from '../context/PromotionContext';
import { SEO } from '../components/seo/SEO';
import { State01Default, State02Success, State03Progress, State04Guidance } from '../components/ui/PromotionsCard';

const C = {
  bg: '#FAF8F2',
  navy: '#10243A',
  navyLight: '#4A5568',
  gold: '#A87908',
  goldDark: '#755811',
  burgundy: '#7A2630',
  muted: '#8C98A4',
};

export const Offers: React.FC = () => {
  const {
    couponCode,
    cartDiscount,
    appliedPromotions,
    unlockMessages,
    subtotal,
    offerDiscount,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { activePromotions } = usePromotions();

  const [couponInput, setCouponInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const totalAfterOffer = subtotal - offerDiscount;

  const handleApply = async (codeOverride?: string) => {
    const code = (codeOverride ?? couponInput).trim().toUpperCase();
    if (!code) return;
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

  // Derive realistic state for the 4 grid items based on application state
  const appliedPromo = appliedPromotions && appliedPromotions.length > 0 ? appliedPromotions[0] : (activePromotions[0] || null);

  const spendMoreMsg = unlockMessages?.find(msg => msg.toLowerCase().includes('spend') || msg.toLowerCase().includes('more'))
    || (activePromotions[0]?.minCartValue ? `Spend ₹${Math.max(1, activePromotions[0].minCartValue - totalAfterOffer)} more to unlock ${activePromotions[0].name}` : 'Spend ₹302 more to unlock Special Offer');

  const conditionMsg = unlockMessages?.find(msg => msg.toLowerCase().includes('condition') || msg.toLowerCase().includes('applicable'))
    || (activePromotions[0]?.minCartValue ? `Min. cart value ₹${activePromotions[0].minCartValue}` : 'Conditions not met yet');

  const invalidMsg = unlockMessages?.find(msg => msg.toLowerCase().includes('invalid')) || localError;

  const progressMin = activePromotions[0]?.minCartValue || 2000;
  const progressPct = progressMin > 0 ? Math.min(100, Math.round((totalAfterOffer / progressMin) * 100)) : 0;

  const Label = ({ title, desc }: { title: string, desc: string }) => (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.goldDark }} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.navyLight }}>
          {title}
        </span>
      </div>
      <span className="text-[11px] italic font-serif" style={{ color: C.muted }}>
        {desc}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: C.bg }}>
      <SEO title="Promotions & Offers" description="Unlock special savings on your favorite attars and perfumes." />

      {/* Header section */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl mb-4" style={{ color: C.navy }}>
              PROMOTIONS & OFFERS
            </h1>
            <p className="font-serif text-[16px] italic" style={{ color: C.navyLight }}>
              Unlock special savings on your favorite attars and perfumes
            </p>
          </div>
          <div className="flex items-center gap-3 md:text-right">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(168, 121, 8, 0.1)' }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color: C.goldDark }}>local_fire_department</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.goldDark }}>
                Exclusively for
              </span>
              <span className="text-[13px] font-serif" style={{ color: C.navy }}>
                Al Ahad Attars Customers
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2x2 Grid */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">

          {/* STATE 01 */}
          <div>
            <Label title="STATE 01 - DEFAULT / EMPTY" desc="Pre-interaction baseline" />
            <State01Default
              couponInput={couponInput} setCouponInput={setCouponInput} handleApply={handleApply}
              isApplying={isApplying} localError={localError} activePromotions={activePromotions}
              showDrawer={showDrawer} setShowDrawer={setShowDrawer} applySuccess={applySuccess}
            />
          </div>

          {/* STATE 02 */}
          <div>
            <Label title="STATE 02 - COUPON APPLIED (SUCCESS)" desc={`✓ ${cartDiscount > 0 ? '₹'+cartDiscount : 'Offer'} Saved`} />
            <State02Success
              appliedPromo={appliedPromo} handleRemove={removeCoupon}
              savedAmount={cartDiscount || 200} activePromotions={activePromotions}
            />
          </div>

          {/* STATE 03 */}
          <div>
            <Label title="STATE 03 - SPEND MORE TO UNLOCK (PROGRESS)" desc={`Needs ₹${Math.max(0, progressMin - totalAfterOffer)} More`} />
            <State03Progress
              spendMoreMsg={spendMoreMsg} couponInput={couponInput} setCouponInput={setCouponInput}
              handleApply={handleApply} isApplying={isApplying} progressPct={progressPct}
              totalAfterOffer={totalAfterOffer} progressMin={progressMin} showDrawer={showDrawer}
              setShowDrawer={setShowDrawer} activePromotions={activePromotions}
            />
          </div>

          {/* STATE 04 */}
          <div>
            <Label title="STATE 04 - CONDITIONS NOT MET (GUIDANCE)" desc="Warm advisory, never harsh red" />
            <State04Guidance
              couponCode={couponCode || 'DIWALI200'} couponInput={couponInput} handleApply={handleApply}
              isApplying={isApplying} localError={invalidMsg} conditionMsg={conditionMsg}
              totalAfterOffer={totalAfterOffer} removeCoupon={removeCoupon} matchedPromo={activePromotions[0]}
            />
          </div>

        </div>
      </div>
    </div>
  );
};
