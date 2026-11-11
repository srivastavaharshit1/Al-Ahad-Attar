import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ProductCard } from '../product/ProductCard';
import type { ProductSummary } from '../../types/product';

interface ProductCarouselProps {
  eyebrow: string;
  heading: string;
  description?: string;
  products: ProductSummary[];
  viewAllUrl: string;
  defaultType?: string;
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  eyebrow,
  heading,
  description,
  products,
  viewAllUrl,
  defaultType,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollBounds = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    checkScrollBounds();
    track.addEventListener('scroll', checkScrollBounds, { passive: true });
    window.addEventListener('resize', checkScrollBounds);
    return () => {
      track.removeEventListener('scroll', checkScrollBounds);
      window.removeEventListener('resize', checkScrollBounds);
    };
  }, [checkScrollBounds, products.length]);

  const scroll = useCallback((direction: 'prev' | 'next') => {
    const track = trackRef.current;
    if (!track) return;
    // Scroll roughly one card distance
    const cardElement = track.querySelector('[role="listitem"]');
    const scrollAmount = cardElement ? (cardElement.clientWidth + 24) : 300;
    track.scrollBy({ left: direction === 'next' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
  }, []);

  if (!products || products.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 md:py-20 overflow-hidden border-b border-[#e4dcc8]/40">
      <div className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto mb-8 sm:mb-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
              <span className="w-5 sm:w-6 h-px bg-accent/60" aria-hidden="true" />
              <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] block font-medium">
                {eyebrow}
              </span>
              <span className="w-5 sm:w-6 h-px bg-accent/60" aria-hidden="true" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-ink font-normal tracking-wide leading-tight">
              {heading}
            </h2>
            {description && (
              <p className="mt-2.5 font-body-md text-on-surface-variant text-xs sm:text-sm max-w-xl leading-relaxed font-light">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-5 shrink-0 pt-2 sm:pt-0">
            {/* Desktop Carousel Controls */}
            <div className="hidden md:flex items-center gap-2">
              <button
                id={`carousel-prev-${heading.replace(/\s+/g, '-').toLowerCase()}`}
                aria-label={`Previous items in ${heading}`}
                disabled={!canScrollLeft}
                onClick={() => scroll('prev')}
                className="w-9 h-9 rounded-full border border-[#e4dcc8] flex items-center justify-center text-ink transition-all duration-300 hover:border-accent hover:text-accent hover:bg-accent/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-[#e4dcc8] disabled:hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                id={`carousel-next-${heading.replace(/\s+/g, '-').toLowerCase()}`}
                aria-label={`Next items in ${heading}`}
                disabled={!canScrollRight}
                onClick={() => scroll('next')}
                className="w-9 h-9 rounded-full border border-[#e4dcc8] flex items-center justify-center text-ink transition-all duration-300 hover:border-accent hover:text-accent hover:bg-accent/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-[#e4dcc8] disabled:hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <Link
              to={viewAllUrl}
              className="inline-flex items-center gap-1.5 sm:gap-2 text-[10.5px] sm:text-[11px] font-label-md uppercase tracking-[0.2em] text-ink border-b border-accent pb-0.5 hover:text-accent transition-colors group whitespace-nowrap"
            >
              <span>View All</span>
              <span className="transform group-hover:translate-x-1 transition-transform duration-300 text-accent">→</span>
            </Link>
          </div>
        </div>

        {/* Delicate Golden Divider */}
        <div className="mt-5 mb-7 sm:mt-6 sm:mb-8 h-px bg-[#e4dcc8]/60" />

        {/* Carousel Track */}
        <div
          ref={trackRef}
          className="carousel-snap-track flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollPaddingLeft: '1rem', scrollPaddingRight: '1rem' }}
          role="list"
          aria-label={heading}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="snap-start shrink-0 w-[68vw] xs:w-[240px] sm:w-[270px] lg:w-[calc(25%-18px)] min-w-[190px] max-w-[300px]"
              role="listitem"
            >
              <ProductCard product={product as any} defaultType={defaultType} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
