import React, { useState, useEffect, useRef } from 'react';
import { usePromotions } from '../../context/PromotionContext';
import { Link } from 'react-router-dom';
import { getPromoIcon, getPromoHeadline } from '../../utils/promotionHelpers';

export const AnnouncementBar: React.FC = () => {
  const { activePromotions, isLoading } = usePromotions();
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

  if (isLoading) {
    return (
      <div className="bg-primary text-on-primary py-2.5 text-center font-label-sm uppercase tracking-[0.2em] z-50 relative h-10 flex items-center justify-center overflow-hidden" role="status">
        <span className="opacity-60 animate-pulse">Loading Offers…</span>
      </div>
    );
  }

  if (activePromotions.length === 0) {
    return (
      <div className="bg-primary text-on-primary py-2.5 text-center font-label-sm uppercase tracking-[0.12em] sm:tracking-[0.2em] z-50 relative h-10 flex items-center justify-center overflow-hidden px-4">
        {/* "Premium Arabic Attars" is dropped below sm: at narrow widths the full line (with
            uppercase tracking) doesn't fit on one row, and this bar's fixed h-10 + overflow-hidden
            clipped the wrapped second line instead of showing it — so the free-shipping message
            (the actionable part) is what has to survive, not both. */}
        <span className="opacity-90 truncate">Free Shipping Above ₹999</span>
        <span className="mx-3 opacity-40 hidden sm:inline">|</span>
        <span className="opacity-90 hidden sm:inline">Premium Arabic Attars</span>
      </div>
    );
  }

  const promo = activePromotions[currentIndex];

  return (
    <div
      className="bg-primary text-on-primary py-2.5 text-center font-label-sm uppercase tracking-[0.12em] sm:tracking-[0.2em] z-50 relative h-10 flex items-center justify-center overflow-hidden"
      role="marquee"
      aria-live="polite"
      aria-label="Current promotions"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute inset-0 flex justify-center items-center w-full">
        <Link
          to="/offers"
          className={`flex items-center justify-center gap-2 transition-all duration-500 ease-in-out hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary rounded-sm w-full px-4 absolute overflow-hidden ${
            fadeState === 'enter'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
        >
          <span aria-hidden="true" className="text-sm shrink-0">{getPromoIcon(promo)}</span>
          <span className="truncate">{getPromoHeadline(promo)}</span>
          {promo.code && (
            <>
              <span className="mx-1.5 opacity-40 hidden sm:inline shrink-0">|</span>
              <span className="font-mono tracking-wider font-semibold hidden sm:inline shrink-0">Code: {promo.code}</span>
            </>
          )}
        </Link>
      </div>
    </div>
  );
};
