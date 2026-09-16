import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePromotions } from '../context/PromotionContext';
import type { PromotionResponse } from '../types/promotion';
import { Loader } from '../components/ui/Loader';
import { SEO } from '../components/seo/SEO';
import { getDaysRemaining } from '../utils/promotionHelpers';

// ── Design Tokens ────────────────────────────────────────────────────────────
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
  heroBg: '#1a1208',        // very deep warm black for hero
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function getDiscountLabel(promo: PromotionResponse): string {
  if (promo.promotionType === 'FREE_SHIPPING') return 'Free Shipping';
  if (promo.promotionType === 'FREE_PRODUCT') return 'Free Gift';
  if (promo.promotionType === 'FIRST_ORDER')
    return promo.discountType === 'PERCENTAGE'
      ? `${promo.discountValue}% off First Order`
      : `₹${promo.discountValue} off First Order`;
  if (promo.discountType === 'PERCENTAGE') return `${promo.discountValue}% OFF`;
  if (promo.discountType === 'FIXED_AMOUNT') return `₹${promo.discountValue} OFF`;
  return promo.name;
}

function getPromoTypeIcon(promo: PromotionResponse): string {
  switch (promo.promotionType) {
    case 'FREE_SHIPPING': return 'local_shipping';
    case 'FREE_PRODUCT': return 'redeem';
    case 'FIRST_ORDER': return 'auto_awesome';
    case 'CATEGORY_DISCOUNT': return 'category';
    case 'PRODUCT_DISCOUNT': return 'inventory_2';
    case 'BUNDLE': return 'package_2';
    default: return 'confirmation_number';
  }
}

function getTypeLabel(promo: PromotionResponse): string {
  switch (promo.promotionType) {
    case 'FREE_SHIPPING': return 'Shipping Offer';
    case 'FREE_PRODUCT': return 'Free Gift';
    case 'FIRST_ORDER': return 'First Order';
    case 'CART_DISCOUNT': return 'Cart Offer';
    case 'CATEGORY_DISCOUNT': return 'Category Offer';
    case 'PRODUCT_DISCOUNT': return 'Product Offer';
    case 'BUNDLE': return 'Bundle Deal';
    default: return 'Special Offer';
  }
}

// ── Offer Card ───────────────────────────────────────────────────────────────
const OfferCard: React.FC<{ promo: PromotionResponse }> = ({ promo }) => {
  const [copied, setCopied] = useState(false);
  const daysLeft = getDaysRemaining(promo.endDate);

  const handleCopy = () => {
    if (!promo.code) return;
    navigator.clipboard.writeText(promo.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const urgentExpiry = daysLeft !== null && daysLeft <= 3;

  return (
    <article
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        backgroundColor: C.card,
        border: `1px solid ${C.border}`,
        boxShadow: '0 2px 12px rgba(28,37,51,0.06)',
      }}
      aria-label={`Offer: ${promo.name}`}
    >
      {/* Top accent bar */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(to right, ${C.gold}, ${C.goldDark})` }}
      />

      <div className="p-6 flex flex-col flex-grow gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Type icon badge */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: C.goldBg, border: `1px solid ${C.goldBorder}` }}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ color: C.goldDark }}>
                {getPromoTypeIcon(promo)}
              </span>
            </div>
            <div>
              {/* Discount label */}
              <span
                className="inline-block text-[10px] font-bold uppercase tracking-[0.18em] px-2.5 py-0.5 rounded-full mb-1.5"
                style={{ backgroundColor: C.burgundyBg, color: C.burgundy, border: `1px solid ${C.burgundyBorder}` }}
              >
                {getDiscountLabel(promo)}
              </span>
              <h3 className="text-[15px] font-bold leading-snug" style={{ color: C.navy }}>
                {promo.name}
              </h3>
            </div>
          </div>

          {/* Type label */}
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded whitespace-nowrap shrink-0"
            style={{ backgroundColor: C.bg, color: C.navyLight, border: `1px solid ${C.border}` }}
          >
            {getTypeLabel(promo)}
          </span>
        </div>

        {/* Description */}
        <p className="text-[13px] leading-relaxed" style={{ color: C.navyLight }}>
          {promo.generatedDescription || promo.description}
        </p>

        {/* Conditions row */}
        <div className="flex flex-wrap gap-2">
          {promo.minCartValue > 0 && (
            <span
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ backgroundColor: C.amberBg, color: C.amber, border: `1px solid ${C.amberBorder}` }}
            >
              <span className="material-symbols-outlined text-[12px]">shopping_cart</span>
              Min. ₹{promo.minCartValue}
            </span>
          )}
          {promo.maxDiscountValue && promo.maxDiscountValue > 0 && (
            <span
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: C.bg, color: C.navyLight, border: `1px solid ${C.border}` }}
            >
              Max. ₹{promo.maxDiscountValue} off
            </span>
          )}
          {promo.promotionType === 'FIRST_ORDER' && (
            <span
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ backgroundColor: C.goldBg, color: C.goldDark, border: `1px solid ${C.goldBorder}` }}
            >
              <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
              First Order
            </span>
          )}
          {urgentExpiry && (
            <span
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ backgroundColor: C.burgundyBg, color: C.burgundy, border: `1px solid ${C.burgundyBorder}` }}
            >
              <span className="material-symbols-outlined text-[12px]">timer</span>
              {daysLeft === 1 ? 'Expires today' : `Expires in ${daysLeft} days`}
            </span>
          )}
          {!urgentExpiry && promo.endDate && (
            <span
              className="text-[10px] px-2.5 py-1 rounded-full"
              style={{ backgroundColor: C.bg, color: C.navyLight, border: `1px solid ${C.border}` }}
            >
              Until {new Date(promo.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>

        {/* Coupon code block + CTA */}
        <div className="mt-auto pt-4 border-t flex items-center justify-between gap-3" style={{ borderColor: C.border }}>
          {promo.code ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="font-mono text-[12px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg select-all"
                style={{
                  backgroundColor: C.goldBg,
                  color: C.goldDark,
                  border: `1.5px dashed ${C.goldBorder}`,
                  letterSpacing: '0.15em',
                }}
              >
                {promo.code}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all"
                style={{
                  color: copied ? C.success : C.goldDark,
                  backgroundColor: copied ? C.successBg : 'transparent',
                  border: `1px solid ${copied ? C.successBorder : C.border}`,
                }}
                aria-label={copied ? 'Code copied' : 'Copy coupon code'}
              >
                <span className="material-symbols-outlined text-[12px]">
                  {copied ? 'check_circle' : 'content_copy'}
                </span>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <span className="text-[11px] italic" style={{ color: C.muted }}>
              Auto-applied at checkout
            </span>
          )}

          <Link
            to="/collection"
            className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-full text-white transition-all hover:brightness-110 shrink-0"
            style={{ backgroundColor: C.goldDark }}
          >
            Shop Now
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </article>
  );
};

// ── Main Offers Page ─────────────────────────────────────────────────────────
export const Offers: React.FC = () => {
  const { activePromotions, isLoading } = usePromotions();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
        <Loader />
      </div>
    );
  }

  const heroPromo = activePromotions.length > 0 ? activePromotions[0] : null;
  const codePromotions = activePromotions.filter(p => p.code);
  const autoPromotions = activePromotions.filter(p => !p.code);

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
      <SEO
        title="Special Offers & Promotions | Al Ahad Attars"
        description="Discover exclusive deals, discounts, and complimentary gifts on our premium collection of Arabic attars and perfumes."
        canonicalUrl="/offers"
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: C.heroBg, minHeight: 340 }}
      >
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(139,105,20,0.20) 0%, transparent 70%)',
          }}
        />
        {/* Fine grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #fff, #fff 1px, transparent 1px, transparent 40px)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-20 md:py-28">
          {/* Label */}
          <span
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] mb-6 px-3 py-1.5 rounded-full"
            style={{ color: C.gold, backgroundColor: 'rgba(139,105,20,0.15)', border: '1px solid rgba(139,105,20,0.3)' }}
          >
            <span className="material-symbols-outlined text-[14px]">local_offer</span>
            Exclusive Offers
          </span>

          {/* Headline */}
          <h1
            className="font-serif text-4xl md:text-5xl lg:text-6xl mb-5 leading-tight"
            style={{ color: '#f5edd8' }}
          >
            {heroPromo ? heroPromo.name : 'Current Promotions'}
          </h1>

          {/* Sub-headline */}
          <p
            className="text-[14px] md:text-[15px] leading-relaxed max-w-xl mb-8"
            style={{ color: 'rgba(245,237,216,0.70)' }}
          >
            {heroPromo
              ? (heroPromo.generatedDescription || heroPromo.description)
              : 'Discover our latest offers and save on premium artisanal Arabic fragrances.'}
          </p>

          {/* Hero coupon code pill */}
          {heroPromo?.code && (
            <div
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full"
              style={{
                backgroundColor: 'rgba(139,105,20,0.18)',
                border: '1.5px solid rgba(201,162,39,0.50)',
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: 'rgba(245,237,216,0.60)' }}
              >
                Use Code
              </span>
              <span
                className="font-mono font-bold text-[16px] uppercase tracking-widest"
                style={{ color: C.goldBorder }}
              >
                {heroPromo.code}
              </span>
            </div>
          )}

          {/* Offer count */}
          {activePromotions.length > 0 && (
            <div className="mt-6 flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: C.goldDark, color: '#fff' }}
              >
                {activePromotions.length}
              </span>
              <span className="text-[11px] uppercase tracking-widest" style={{ color: 'rgba(245,237,216,0.50)' }}>
                active offer{activePromotions.length !== 1 ? 's' : ''} available
              </span>
            </div>
          )}
        </div>

        {/* Bottom edge fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, transparent, ${C.bg})` }}
        />
      </section>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-20">

        {/* Section label */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <span
              className="text-[9px] font-bold uppercase tracking-[0.3em] mb-2 block"
              style={{ color: C.goldDark }}
            >
              Current Deals
            </span>
            <h2
              className="font-serif text-2xl md:text-3xl"
              style={{ color: C.navy }}
            >
              All Active Promotions
            </h2>
          </div>
          <Link
            to="/collection"
            className="hidden md:flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-full text-white transition-all hover:brightness-110"
            style={{ backgroundColor: C.goldDark }}
          >
            Shop Collection
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>

        {/* No offers */}
        {activePromotions.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-24">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: C.goldBg, border: `1px solid ${C.goldBorder}` }}
            >
              <span className="material-symbols-outlined text-[36px]" style={{ color: C.goldDark }}>
                hourglass_empty
              </span>
            </div>
            <h3 className="font-serif text-xl mb-3" style={{ color: C.navy }}>
              No Active Offers
            </h3>
            <p className="text-[13px] max-w-sm leading-relaxed mb-8" style={{ color: C.navyLight }}>
              Our next exclusive promotion is being curated. Check back soon for new savings on our artisanal fragrances.
            </p>
            <Link
              to="/collection"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest text-white transition-all hover:brightness-110"
              style={{ backgroundColor: C.goldDark }}
            >
              Explore Collection
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        )}

        {/* Coupon-code offers */}
        {codePromotions.length > 0 && (
          <>
            {activePromotions.length > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-[15px]" style={{ color: C.goldDark }}>
                  confirmation_number
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: C.goldDark }}
                >
                  Coupon Codes
                </span>
                <div className="flex-grow h-px" style={{ backgroundColor: C.border }} />
                <span className="text-[10px]" style={{ color: C.muted }}>
                  Enter at checkout
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {codePromotions.map(promo => (
                <OfferCard key={promo.id} promo={promo} />
              ))}
            </div>
          </>
        )}

        {/* Auto-applied offers */}
        {autoPromotions.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-[15px]" style={{ color: C.goldDark }}>
                auto_awesome
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: C.goldDark }}
              >
                Auto-Applied Offers
              </span>
              <div className="flex-grow h-px" style={{ backgroundColor: C.border }} />
              <span className="text-[10px]" style={{ color: C.muted }}>
                Applied automatically
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {autoPromotions.map(promo => (
                <OfferCard key={promo.id} promo={promo} />
              ))}
            </div>
          </>
        )}

        {/* Info footer card */}
        {activePromotions.length > 0 && (
          <div
            className="mt-4 px-6 py-5 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
            style={{ backgroundColor: C.goldBg, border: `1px solid ${C.goldBorder}` }}
          >
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[20px] mt-0.5 shrink-0" style={{ color: C.goldDark }}>
                info
              </span>
              <p className="text-[12px] leading-relaxed" style={{ color: C.navyLight }}>
                Offers are subject to availability and may have usage limits. Only one coupon can typically be applied per order.
                Discounts apply on qualifying products only.
              </p>
            </div>
            <Link
              to="/cart"
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider shrink-0 transition-opacity hover:opacity-70"
              style={{ color: C.goldDark }}
            >
              Apply in Cart
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};
