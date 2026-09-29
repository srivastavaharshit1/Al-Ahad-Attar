import React, { useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../product/ProductCard';
import type { ProductSummary } from '../../types/product';

interface ProductCarouselProps {
  /** Short uppercase label shown in gold above the heading, e.g. "THE COLLECTION" */
  eyebrow: string;
  /** Main section heading */
  heading: string;
  /** Optional one-line description shown below the heading */
  description?: string;
  products: ProductSummary[];
  /** URL for the "View All" link */
  viewAllUrl: string;
  /** Passed through to ProductCard for preferred-size resolution */
  defaultType?: string;
}

/**
 * Premium horizontal product carousel.
 *
 * Mobile (< 640px):  shows 1.15 cards — the sliver of the next card signals scrollability.
 * Tablet (640–1024px): ~2.2 cards.
 * Desktop (≥ 1024px): 4 cards exactly, with prev/next arrow buttons.
 *
 * Uses CSS scroll-snap for buttery-smooth native swipe. No JS-based animation library.
 * Arrow buttons are rendered only on desktop to avoid clutter on touch screens.
 */
export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  eyebrow,
  heading,
  description,
  products,
  viewAllUrl,
  defaultType,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: 'prev' | 'next') => {
    const track = trackRef.current;
    if (!track) return;
    // Scroll by roughly one card width (card width = ~280px on desktop).
    const cardWidth = track.scrollWidth / products.length;
    track.scrollBy({ left: direction === 'next' ? cardWidth : -cardWidth, behavior: 'smooth' });
  }, [products.length]);

  if (!products || products.length === 0) return null;

  return (
    <section className="py-20 md:py-28 overflow-hidden">
      {/* Header row */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto mb-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[#d4af37] text-[10px] font-label-md uppercase tracking-[0.35em] mb-3 block">
              {eyebrow}
            </span>
            <h2 className="font-headline-lg text-3xl md:text-4xl text-[#121c2a] font-normal tracking-wide leading-tight">
              {heading}
            </h2>
            {description && (
              <p className="mt-3 font-body-md text-on-surface-variant text-sm max-w-xl leading-relaxed">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Desktop arrow buttons */}
            <div className="hidden md:flex gap-2">
              <button
                id={`carousel-prev-${heading.replace(/\s+/g, '-').toLowerCase()}`}
                aria-label={`Previous products in ${heading}`}
                onClick={() => scroll('prev')}
                className="w-10 h-10 border border-[#121c2a]/20 flex items-center justify-center text-[#121c2a] hover:bg-[#121c2a] hover:text-white transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              </button>
              <button
                id={`carousel-next-${heading.replace(/\s+/g, '-').toLowerCase()}`}
                aria-label={`Next products in ${heading}`}
                onClick={() => scroll('next')}
                className="w-10 h-10 border border-[#121c2a]/20 flex items-center justify-center text-[#121c2a] hover:bg-[#121c2a] hover:text-white transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>

            <Link
              to={viewAllUrl}
              className="inline-flex items-center gap-2 text-[10px] font-label-md uppercase tracking-[0.2em] text-[#121c2a] border-b border-[#d4af37] pb-0.5 hover:text-[#d4af37] transition-colors group whitespace-nowrap"
            >
              View All
              <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
            </Link>
          </div>
        </div>

        {/* Gold divider */}
        <div className="mt-6 mb-8 h-px bg-[#121c2a]/10" />

        {/*
          Carousel track.
          Now contained within the same max-w-7xl container as the header to ensure perfect horizontal alignment.
          Card widths are adjusted so that 4 cards + a partial 5th card are visible on desktop.
        */}
        <div
          ref={trackRef}
          className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 hide-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
          role="list"
          aria-label={heading}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="snap-start shrink-0 w-[calc(85vw-2rem)] sm:w-[calc(45vw-2rem)] lg:w-[calc(22%)] min-w-[240px] max-w-[320px]"
              role="listitem"
            >
              <ProductCard product={product as any} defaultType={defaultType} />
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      ` }} />
    </section>
  );
};
