import React, { useState, useEffect } from 'react';
import { useCart } from '../../hooks/useCart';
import { giftServiceService } from '../../services/giftServiceService';
import type { GiftServiceItem } from '../../services/giftServiceService';
import { formatPrice } from '../../utils/formatPrice';
import { getImageUrl } from '../../utils/getImageUrl';

export const GiftWrappingOptions: React.FC = () => {
  const { giftServiceId, setGiftServiceId, giftMessage, setGiftMessage } = useCart();
  const [giftServices, setGiftServices] = useState<GiftServiceItem[]>([]);
  const [detailsService, setDetailsService] = useState<GiftServiceItem | null>(null);

  useEffect(() => {
    fetchGiftServices();
  }, []);

  const fetchGiftServices = async () => {
    try {
      const res = await giftServiceService.getActiveServices();
      setGiftServices(res.data || []);
    } catch (err) {
      console.error("Failed to load gift services", err);
    }
  };

  const handleSelectGiftService = (id: number | null) => {
    setGiftServiceId(id);
  };

  const [showAll, setShowAll] = useState(false);
  
  const maxVisibleServices = 2; // 1 (No Gift) + 2 (Services) = 3 initially
  const visibleServices = showAll ? giftServices : giftServices.slice(0, maxVisibleServices);
  const hasMore = giftServices.length > maxVisibleServices;

  if (giftServices.length === 0) return null;

  return (
    <section>
      <div className="mb-6 border-b border-outline-variant pb-4">
        <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">redeem</span>
          Make it a Gift
        </h2>
        <p className="text-on-surface-variant font-body-sm mt-1 leading-relaxed">
          Choose a premium packaging option for a special touch.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* No Gift Option */}
        <button
          type="button"
          onClick={() => handleSelectGiftService(null)}
          className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 flex items-center gap-3 text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
            giftServiceId === null
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
          {giftServiceId === null && (
            <span className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[14px]">check</span>
            </span>
          )}
        </button>

        {/* Gift Service Options */}
        {visibleServices.map(service => (
          <button
            type="button"
            key={service.id}
            onClick={() => handleSelectGiftService(service.id)}
            className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 flex items-center gap-3 text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
              giftServiceId === service.id
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
                <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{service.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs font-medium text-primary">{formatPrice(service.price)}</p>
                {service.description && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setDetailsService(service); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); setDetailsService(service); } }}
                    className="text-xs text-on-surface-variant underline hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                  >
                    View details
                  </span>
                )}
              </div>
            </div>
            {giftServiceId === service.id && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[14px]">check</span>
              </span>
            )}
          </button>
        ))}

        {!showAll && hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="relative cursor-pointer rounded-xl border-2 border-dashed border-outline-variant hover:border-primary/40 p-4 transition-all duration-200 flex flex-col items-center justify-center gap-1 text-center w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent h-full min-h-[96px]"
          >
            <span className="font-label-md text-primary">See all {giftServices.length + 1} options</span>
            <span className="material-symbols-outlined text-primary text-[20px]">expand_more</span>
          </button>
        )}
      </div>

      {showAll && hasMore && (
        <div className="flex justify-center -mt-2 mb-6">
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="text-primary font-label-md hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm px-2 py-1"
          >
            Show less
            <span className="material-symbols-outlined text-[18px]">expand_less</span>
          </button>
        </div>
      )}

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
          className="w-full bg-transparent border border-outline-variant rounded-lg p-3 text-on-surface font-body-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary outline-none resize-none"
        />
        <p className="text-xs text-on-surface-variant text-right mt-1">{giftMessage.length}/250</p>
      </div>

      {/* Details Modal */}
      {detailsService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDetailsService(null)}>
          <div className="bg-surface rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setDetailsService(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            {detailsService.imageUrl && (
              <div className="w-full h-56 bg-surface-container relative">
                <img src={getImageUrl(detailsService.imageUrl)} alt={detailsService.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-headline-md text-white">{detailsService.name}</h3>
                  <p className="text-white/90 font-medium">{formatPrice(detailsService.price)}</p>
                </div>
              </div>
            )}
            <div className="p-6">
              {!detailsService.imageUrl && (
                <div className="mb-4">
                  <h3 className="font-headline-md text-on-surface">{detailsService.name}</h3>
                  <p className="text-primary font-medium mt-1">{formatPrice(detailsService.price)}</p>
                </div>
              )}
              <h4 className="font-label-md text-on-surface mb-2 uppercase tracking-wider text-xs">Service Description</h4>
              <p className="font-body-md text-on-surface-variant leading-relaxed">
                {detailsService.description || "No additional details available for this service."}
              </p>
              
              <div className="mt-8 pt-4 border-t border-outline-variant flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectGiftService(detailsService.id);
                    setDetailsService(null);
                  }}
                  className="px-6 py-2.5 bg-primary text-on-primary rounded-full font-label-md hover:bg-primary/90 transition-colors"
                >
                  Select this option
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
