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
      <section className="relative h-[400px] bg-primary flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-primary to-[#c69a50] z-0"></div>
        <div className="relative z-20 text-center px-6">
          <span className="inline-block px-4 py-1 bg-white/20 backdrop-blur text-white font-label-md uppercase tracking-widest rounded-full mb-6">
            Exclusive Offers
          </span>
          <h1 className="font-display-lg text-display-lg text-white mb-4">
            {heroPromo ? heroPromo.name : 'Current Promotions'}
          </h1>
          <p className="font-body-lg text-white/90 max-w-2xl mx-auto mb-8">
            {heroPromo ? heroPromo.description : 'Discover our latest offers and save on premium Arabic fragrances.'}
          </p>
          {heroPromo?.code && (
            <div className="inline-flex items-center gap-3 bg-white/10 border border-white/30 rounded-full px-6 py-3 text-white">
              <span className="font-label-sm uppercase tracking-widest opacity-80">Use Code:</span>
              <span className="font-mono font-bold text-lg">{heroPromo.code}</span>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-gap">
        <h2 className="font-display-sm text-display-sm text-center mb-12">All Active Promotions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {activePromotions.map((promo) => (
            <div key={promo.id} className="group relative overflow-hidden rounded-xl bg-surface border border-outline-variant hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-[#c69a50]"></div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="inline-block text-primary font-label-md uppercase tracking-wider mb-2 text-sm">
                      {getDiscountLabel(promo)}
                    </span>
                    <h3 className="font-headline-md text-on-surface">{promo.name}</h3>
                  </div>
                  {promo.code && (
                    <div className="flex-shrink-0 text-center ml-4">
                      <span className="block text-xs text-on-surface-variant mb-1 uppercase tracking-wider">Code</span>
                      <span className="font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded text-sm">
                        {promo.code}
                      </span>
                    </div>
                  )}
                </div>
                <p className="font-body-md text-on-surface-variant mb-4">{promo.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-6 text-xs text-on-surface-variant">
                  {promo.minCartValue > 0 && (
                    <span className="bg-surface-container px-2 py-1 rounded">Min. ₹{promo.minCartValue}</span>
                  )}
                  {promo.maxDiscountValue && (
                    <span className="bg-surface-container px-2 py-1 rounded">Max. ₹{promo.maxDiscountValue} off</span>
                  )}
                  {promo.endDate && (
                    <span className="bg-surface-container px-2 py-1 rounded">
                      Expires {new Date(promo.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {promo.promotionType === 'FIRST_ORDER' && (
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">First Order Only</span>
                  )}
                </div>

                <Link to="/collection" className="inline-flex items-center gap-2 font-label-md text-primary hover:text-primary/80 transition-colors">
                  Shop Now <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))}
          
          {activePromotions.length === 0 && (
            <p className="col-span-1 md:col-span-2 text-center text-on-surface-variant italic py-16">
              No active offers at the moment. Check back later!
            </p>
          )}
        </div>
      </section>
    </div>
  );
};
