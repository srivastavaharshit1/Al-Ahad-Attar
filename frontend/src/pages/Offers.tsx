import React from 'react';
import { Link } from 'react-router-dom';
import { usePromotions } from '../context/PromotionContext';
import type { PromotionResponse } from '../types/promotion';
import { Loader } from '../components/ui/Loader';

export const Offers: React.FC = () => {
  const { activePromotions, isLoading } = usePromotions();

  if (isLoading) return <div className="py-24"><Loader /></div>;

  const getDiscountLabel = (promo: PromotionResponse): string => {
    if (promo.promotionType === 'FREE_SHIPPING') return 'Free Shipping';
    if (promo.promotionType === 'FREE_PRODUCT') {
      return `Free Gift Campaign`;
    }
    if (promo.promotionType === 'FIRST_ORDER') {
      return promo.discountType === 'PERCENTAGE'
        ? `${promo.discountValue}% OFF on First Order`
        : `₹${promo.discountValue} OFF on First Order`;
    }
    if (promo.discountType === 'PERCENTAGE') return `${promo.discountValue}% OFF`;
    if (promo.discountType === 'FIXED_AMOUNT') return `₹${promo.discountValue} OFF`;
    return promo.name;
  };

  const heroPromo = activePromotions.length > 0 ? activePromotions[0] : null;

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="relative h-[400px] bg-ink flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink to-ink-hover"></div>
        <div className="relative z-20 text-center px-6">
          <span className="text-accent text-[10px] md:text-[11px] font-label-md uppercase tracking-[0.4em] mb-6 block">
            Exclusive Offers
          </span>
          <h1 className="font-display-lg text-display-lg text-white mb-4" style={{ textShadow: '0 2px 12px rgba(0,0,0,.25)' }}>
            {heroPromo ? heroPromo.name : 'Current Promotions'}
          </h1>
          <p className="font-body-lg text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
            {heroPromo ? (heroPromo.generatedDescription || heroPromo.description) : 'Discover our latest offers and save on premium Arabic fragrances.'}
          </p>
          {heroPromo?.code && (
            <div className="inline-flex items-center gap-3 bg-white/10 border border-white/30 rounded-full px-6 py-3 text-white">
              <span className="font-label-sm uppercase tracking-widest opacity-80">Use Code:</span>
              <span className="font-mono font-bold text-lg text-accent">{heroPromo.code}</span>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16 md:py-24">
        <div className="text-center mb-12">
          <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-3 block">Current Deals</span>
          <h2 className="font-display-sm text-display-sm text-on-surface">All Active Promotions</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {activePromotions.map((promo) => (
            <div key={promo.id} className="card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-accent"></div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="badge badge-gold mb-3">
                      {getDiscountLabel(promo)}
                    </span>
                    <h3 className="font-headline-md text-on-surface mt-2">{promo.name}</h3>
                  </div>
                  {promo.code && (
                    <div className="flex-shrink-0 text-center ml-4">
                      <span className="block text-xs text-on-surface-variant mb-1 uppercase tracking-wider">Code</span>
                      <span className="font-mono font-bold text-accent-hover bg-accent-soft border border-accent/30 px-3 py-1 rounded text-sm">
                        {promo.code}
                      </span>
                    </div>
                  )}
                </div>
                <p className="font-body-md text-on-surface-variant mb-4 leading-relaxed">{promo.generatedDescription || promo.description}</p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {promo.minCartValue > 0 && (
                    <span className="badge badge-neutral">Min. ₹{promo.minCartValue}</span>
                  )}
                  {promo.maxDiscountValue && (
                    <span className="badge badge-neutral">Max. ₹{promo.maxDiscountValue} off</span>
                  )}
                  {promo.endDate && (
                    <span className="badge badge-neutral">
                      Expires {new Date(promo.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {promo.promotionType === 'FIRST_ORDER' && (
                    <span className="badge badge-gold">First Order Only</span>
                  )}
                </div>

                <Link
                  to="/collection"
                  className="inline-flex items-center gap-2 font-label-md text-accent-hover transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-sm"
                >
                  Shop Now <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))}

          {activePromotions.length === 0 && (
            <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center text-center py-20">
              <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-accent text-2xl">local_offer</span>
              </div>
              <h3 className="font-headline-md text-on-surface mb-2 tracking-widest uppercase text-lg">No Active Offers</h3>
              <p className="font-body-md text-on-surface-variant mb-8 max-w-sm leading-relaxed">Check back soon for new promotions and exclusive savings.</p>
              <Link to="/collection" className="btn btn-primary">Shop Collection</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
