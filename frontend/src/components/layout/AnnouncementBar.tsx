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
      <div className="bg-primary text-on-primary py-2.5 text-center font-label-sm uppercase tracking-[0.2em] z-50 relative h-10 flex items-center justify-center overflow-hidden">
        <span className="opacity-90">Free Shipping Above ₹999</span>
        <span className="mx-3 opacity-40">|</span>
        <span className="opacity-90">Premium Arabic Attars</span>
      </div>
    );
  }

  const promo = activePromotions[currentIndex];

  return (
    <div
      className="bg-primary text-on-primary py-2.5 text-center font-label-sm uppercase tracking-[0.2em] z-50 relative h-10 flex items-center justify-center overflow-hidden"
      role="marquee"
      aria-live="polite"
      aria-label="Current promotions"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute inset-0 flex justify-center items-center w-full">
        <Link
          to="/offers"
          className={`flex items-center justify-center gap-2 transition-all duration-500 ease-in-out hover:opacity-80 w-full px-4 absolute ${
            fadeState === 'enter' 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
        >
          <span aria-hidden="true" className="text-sm">{getPromoIcon(promo)}</span>
          <span>{getPromoHeadline(promo)}</span>
          {promo.code && (
            <>
              <span className="mx-1.5 opacity-40">|</span>
              <span className="font-mono tracking-wider font-semibold">Code: {promo.code}</span>
            </>
          )}
        </Link>
      </div>
    </div>
  );
};
