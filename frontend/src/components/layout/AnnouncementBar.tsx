import React, { useState, useEffect, useRef } from 'react';
import { usePromotions } from '../../context/PromotionContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { Link } from 'react-router-dom';
import { getPromoIcon, getPromoHeadline } from '../../utils/promotionHelpers';

export const AnnouncementBar: React.FC = () => {
  const { activePromotions, isLoading } = usePromotions();
  const { settings, isLoading: isSettingsLoading } = useStoreSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [fadeState, setFadeState] = useState<'enter' | 'exit'>('enter');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activePromotions.length <= 1 || isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const startCycle = () => {
      timerRef.current = setTimeout(() => {
        setFadeState('exit');
        
        setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % activePromotions.length);
          setFadeState('enter');
        }, 500); // 500ms exit transition
        
      }, 4500); // Wait 4.5s before transitioning
    };

    startCycle();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activePromotions.length, currentIndex, isPaused]);

  if (isSettingsLoading) {
    return null;
  }

  if (settings && settings.isAnnouncementBarActive === false) {
    return null;
  }

  if (settings && settings.customAnnouncementText && settings.customAnnouncementText.trim() !== '') {
    return (
      <div className="bg-[#B68D40] text-white py-2 text-center font-sans uppercase tracking-[0.16em] sm:tracking-[0.22em] text-[10px] sm:text-[11px] z-50 relative min-h-[36px] flex items-center justify-center overflow-hidden px-4 font-medium shadow-xs">
        <span className="truncate flex items-center gap-2">
          {settings.customAnnouncementText}
        </span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-[#B68D40] text-white py-2 text-center font-sans uppercase tracking-[0.22em] text-[10px] sm:text-[11px] z-50 relative min-h-[36px] flex items-center justify-center overflow-hidden font-medium" role="status">
        <span className="opacity-75 animate-pulse">Loading Offers…</span>
      </div>
    );
  }

  if (activePromotions.length > 0) {
    const promo = activePromotions[currentIndex];

    return (
      <div
        className="bg-[#B68D40] text-white py-2 text-center font-sans uppercase tracking-[0.14em] sm:tracking-[0.2em] text-[10px] sm:text-[11px] z-50 relative min-h-[36px] flex items-center justify-center overflow-hidden shadow-xs font-medium"
        role="marquee"
        aria-live="polite"
        aria-label="Current promotions"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="absolute inset-0 flex justify-center items-center w-full">
          <Link
            to="/offers"
            className={`flex items-center justify-center gap-2.5 transition-all duration-500 ease-in-out hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded-xs w-full px-4 absolute overflow-hidden ${
              fadeState === 'enter'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-3 pointer-events-none'
            }`}
          >
            <span aria-hidden="true" className="text-white text-xs shrink-0">{getPromoIcon(promo)}</span>
            <span className="truncate tracking-[0.14em] sm:tracking-[0.18em]">{getPromoHeadline(promo)}</span>
            {promo.code && (
              <span className="inline-flex items-center gap-1.5 shrink-0 ml-1">
                <span className="opacity-40 hidden sm:inline shrink-0">|</span>
                <span className="bg-white/20 border border-white/30 text-white font-mono text-[10px] px-2 py-0.5 rounded-[2px] tracking-wider font-semibold hidden sm:inline-block">
                  CODE: {promo.code}
                </span>
              </span>
            )}
            <span className="text-white/80 text-[10px] hidden md:inline ml-1 shrink-0">→</span>
          </Link>
        </div>
      </div>
    );
  }

  // Fallback default brand announcement when active and no custom text or active promotions
  const freeThreshold = settings?.freeShippingThreshold
    ? `₹${Math.round(settings.freeShippingThreshold).toLocaleString('en-IN')}`
    : '₹1,499';

  return (
    <div className="w-full bg-[#B68D40] text-white py-2 px-4 text-center text-[10px] sm:text-[11px] font-sans uppercase tracking-[0.16em] sm:tracking-[0.22em] font-medium z-50 relative min-h-[36px] flex items-center justify-center shadow-xs">
      <span>• YOUR FRAGRANCE IS YOUR SIGNATURE •</span>
      <span className="mx-2 opacity-50">|</span>
      <span>COMPLIMENTARY EXPRESS DELIVERY ON ORDERS OVER {freeThreshold} •</span>
    </div>
  );
};
