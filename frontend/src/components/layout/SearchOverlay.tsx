import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Package,
  Droplets,
  Compass,
  Flame,
  Sparkles,
} from 'lucide-react';
import { productService } from '../../services/productService';
import { getImageUrl } from '../../utils/getImageUrl';
import { resolveProductImage } from '../../utils/productUtils';
import { formatPrice } from '../../utils/formatPrice';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useFocusTrap(overlayRef, isOpen);

  // Lock body scroll when search overlay is open and restore on unmount/close
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Helper to load detailed image & notes for top cards
  const hydrateProductsWithDetails = async (products: any[]): Promise<any[]> => {
    return Promise.all(
      products.slice(0, 3).map(async (p) => {
        if (p.images && p.images.length > 0) return p;
        try {
          const fullRes = await productService.getProduct(String(p.id));
          if (fullRes?.data) {
            return {
              ...p,
              ...fullRes.data,
              images: fullRes.data.images || [],
            };
          }
          return p;
        } catch {
          return p;
        }
      })
    );
  };

  // Fetch initial suggested products on open
  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      setSearchQuery('');
      setIsLoading(true);

      productService
        .getProducts({ sort: 'id,asc', active: true, size: 6 })
        .then((res) => {
          const items = res?.content || [];
          setSuggestedProducts(items);
          setIsLoading(false);
          hydrateProductsWithDetails(items)
            .then((hydrated) => setSuggestedProducts(hydrated))
            .catch(console.error);
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (!isOpen) return;

    const query = searchQuery.trim();
    if (!query) {
      productService
        .getProducts({ sort: 'id,asc', active: true, size: 6 })
        .then((res) => {
          const items = res?.content || [];
          setSuggestedProducts(items);
          hydrateProductsWithDetails(items)
            .then((hydrated) => setSuggestedProducts(hydrated))
            .catch(console.error);
        })
        .catch(console.error);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      productService
        .getProducts({ search: query, active: true, size: 6 })
        .then((res) => {
          const items = res?.content || [];
          setSuggestedProducts(items);
          setIsLoading(false);
          hydrateProductsWithDetails(items)
            .then((hydrated) => setSuggestedProducts(hydrated))
            .catch(console.error);
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
        });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    if (trimmed) {
      onClose();
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleTermClick = (term: string) => {
    setSearchQuery(term);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Search fragrances"
      className={`fixed inset-0 z-50 bg-[#FAF7F0] flex flex-col overflow-y-auto transition-all duration-300 ease-out ${
        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
      }`}
    >
      {/* Top Header Bar */}
      <header className="px-6 sm:px-12 py-5 sm:py-6 flex items-center justify-between sticky top-0 bg-[#FAF7F0]/95 backdrop-blur-xs z-20">
        {/* Brand Monogram & Typography */}
        <Link to="/" onClick={onClose} className="flex items-center gap-3 group focus:outline-none">
          <div className="w-8 h-8 rounded-full border border-[#C8A55E] flex items-center justify-center text-[#C8A55E] font-serif text-xs font-semibold tracking-wider bg-white/60 group-hover:bg-[#C8A55E] group-hover:text-white transition-all shadow-3xs">
            AA
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-xs sm:text-sm font-semibold tracking-[0.25em] text-[#121C2A] uppercase">
              Al Ahad Attars
            </span>
            <span className="text-[8px] sm:text-[9px] tracking-[0.3em] text-[#C8A55E] font-sans uppercase font-medium">
              Haute Parfumerie Orientale
            </span>
          </div>
        </Link>

        {/* ESC TO CLOSE & Clean Minimal X */}
        <button
          onClick={onClose}
          aria-label="Close search overlay (Press Escape)"
          className="group inline-flex items-center gap-2 text-[#8C8270] hover:text-[#121C2A] transition-colors focus:outline-none min-h-[44px] min-w-[44px] justify-end cursor-pointer"
        >
          <span className="text-[10px] sm:text-[11px] font-medium tracking-[0.2em] uppercase hidden sm:inline">
            ESC TO CLOSE
          </span>
          <X className="w-4 h-4 text-[#121C2A] group-hover:text-[#C8A55E] transition-colors stroke-[1.5]" />
        </button>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-16 flex-grow flex flex-col">
        {/* Main Heading, Subtitle & Center Gold Ornament */}
        <div className="text-center max-w-2xl mx-auto mb-6">
          <h1 className="font-serif text-4xl sm:text-5xl text-[#121C2A] font-normal tracking-tight mb-2">
            Discover Fragrances
          </h1>
          <p className="font-serif italic text-sm sm:text-base text-[#8C8270] font-light leading-relaxed mb-4">
            Find your signature scent from pure botanical and rare artisanal extractions
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="w-10 h-px bg-[#C8A55E]/40" />
            <span className="text-[#C8A55E] text-xs">✦</span>
            <span className="w-10 h-px bg-[#C8A55E]/40" />
          </div>
        </div>

        {/* Pill-Shaped Search Input with ↵ Enter action */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearchSubmit();
          }}
          className="max-w-xl mx-auto w-full relative mb-4"
          role="search"
        >
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#C8A55E] absolute left-4.5 pointer-events-none stroke-[2]" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for attars, notes, or collections..."
              className="w-full bg-white rounded-full py-3 sm:py-3.5 pl-11 pr-24 text-xs sm:text-sm text-[#121C2A] placeholder:text-[#8C8270]/70 border border-[#C8A55E] focus:border-[#C8A55E] focus:ring-2 focus:ring-[#C8A55E]/20 shadow-2xs transition-all outline-none caret-[#C8A55E]"
            />
            <div className="absolute right-2.5 flex items-center gap-1.5">
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear query"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[#8C8270] hover:text-[#121C2A] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                aria-label="Submit search"
                className="border border-[#E4DCC8] hover:border-[#C8A55E] bg-[#FAF7F0] hover:bg-white text-[#8C8270] hover:text-[#121C2A] rounded-full px-2.5 py-0.5 text-[11px] font-sans transition-all flex items-center gap-1 focus:outline-none cursor-pointer"
              >
                <span className="text-[10px]">↵</span> Enter
              </button>
            </div>
          </div>
        </form>

        {/* POPULAR Search Terms Row */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto mb-10">
          <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-[#8C8270] mr-1">
            POPULAR:
          </span>
          {['Oud', 'Musk', 'Floral', 'Woody', 'Amber', 'Taif Rose'].map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => handleTermClick(term)}
              className="px-3 py-0.5 rounded-full text-xs font-sans text-[#5A6578] bg-white border border-[#E4DCC8] hover:border-[#C8A55E] hover:text-[#121C2A] transition-all shadow-3xs cursor-pointer"
            >
              {term}
            </button>
          ))}
        </div>

        {/* Content Layout — Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 w-full pt-4">
          {/* LEFT COLUMN: Trending Searches, Quick Categories, Sample Discovery Set */}
          <div className="lg:col-span-4 lg:pr-8 lg:border-r lg:border-[#E4DCC8]/70 flex flex-col gap-6">
            {/* Trending Searches */}
            <div>
              <div className="flex items-center gap-1.5 text-[#8C8270] text-[11px] font-semibold tracking-[0.2em] uppercase mb-3">
                <ArrowUpRight className="w-3.5 h-3.5 text-[#C8A55E]" />
                <span>TRENDING SEARCHES</span>
              </div>
              <div className="divide-y divide-[#E4DCC8]/50 border-t border-[#E4DCC8]/50">
                {[
                  { num: '01', term: 'Oud Wood' },
                  { num: '02', term: 'Attar' },
                  { num: '03', term: 'White Musk' },
                  { num: '04', term: 'Bakhoor' },
                ].map((item) => (
                  <button
                    key={item.term}
                    type="button"
                    onClick={() => handleTermClick(item.term)}
                    className="flex items-center w-full py-3 group text-left transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] font-mono text-[#C8A55E] mr-3">{item.num}</span>
                    <span className="font-serif text-base text-[#121C2A] group-hover:text-[#C8A55E] transition-colors font-medium">
                      {item.term}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Categories */}
            <div>
              <div className="flex items-center gap-1.5 text-[#8C8270] text-[11px] font-semibold tracking-[0.2em] uppercase mb-3">
                <Clock className="w-3.5 h-3.5 text-[#C8A55E]" />
                <span>QUICK CATEGORIES</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Pure Dehn Oud', query: 'Oud', icon: Droplets },
                  { label: 'Royal Musk', query: 'Musk', icon: Sparkles },
                  { label: 'Mukhallat Blends', query: 'Mukhallat', icon: Compass },
                  { label: 'Incense & Bakhoor', query: 'Bakhoor', icon: Flame },
                ].map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => handleTermClick(cat.query)}
                      className="bg-white border border-[#E4DCC8] hover:border-[#C8A55E] rounded-md px-3 py-2.5 flex items-center justify-between text-left text-xs font-sans text-[#121C2A] hover:text-[#C8A55E] transition-all group shadow-3xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <Icon className="w-3.5 h-3.5 text-[#C8A55E] shrink-0" />
                        <span className="truncate">{cat.label}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-[#C8A55E]/60 group-hover:text-[#C8A55E] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sample Discovery Set Card */}
            <Link
              to="/gift-sets"
              onClick={onClose}
              className="block bg-white border border-[#E4DCC8] rounded-md p-4 relative mt-2 group hover:border-[#C8A55E] transition-all shadow-3xs hover:shadow-2xs cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#C8A55E] border border-[#C8A55E] px-2 py-0.5 rounded-xs">
                  DISCOVERY
                </span>
                <span className="text-[#C8A55E] text-xs">✦</span>
              </div>
              <h4 className="font-serif text-sm font-medium text-[#121C2A] group-hover:text-[#C8A55E] transition-colors mb-1">
                Sample Discovery Set
              </h4>
              <p className="text-[11px] text-[#8C8270] leading-relaxed font-light mb-1">
                Try 5 signature handcrafted attars in 1.5ml flacons before choosing your full bottle.
              </p>
            </Link>
          </div>

          {/* RIGHT COLUMN: Suggested Products / Query Results */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div>
              {/* Header Row */}
              <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#E4DCC8]/70">
                <div className="flex items-center gap-2 text-[#8C8270] text-[11px] font-semibold tracking-[0.2em] uppercase">
                  <span className="text-[#C8A55E]">✦</span>
                  <span>
                    {searchQuery.trim()
                      ? `RESULTS FOR "${searchQuery.trim()}"`
                      : 'SUGGESTED PRODUCTS'}
                  </span>
                </div>
                <Link
                  to="/collection"
                  onClick={onClose}
                  className="font-serif italic text-xs text-[#C8A55E] hover:underline flex items-center gap-1"
                >
                  <span>Explore Vault</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Product Grid / Empty State */}
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#8C8270]">
                  <div className="w-8 h-8 border-2 border-[#C8A55E] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs tracking-wider uppercase font-serif">
                    Unveiling Fragrances...
                  </p>
                </div>
              ) : suggestedProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {suggestedProducts.slice(0, 3).map((product: any, idx: number) => {
                    const primaryImage =
                      resolveProductImage(product.images) ||
                      product.thumbnail ||
                      product.imageUrl ||
                      (product.images && product.images[0]?.imageUrl) ||
                      '';
                    const price =
                      product.minimumPrice ||
                      (product.variants && product.variants[0]?.price) ||
                      (product.availablePrices && product.availablePrices[0]) ||
                      0;
                    const volume =
                      product.defaultVariantSize ||
                      (product.variants && product.variants[0]?.size) ||
                      (product.availableSizes && product.availableSizes[0]) ||
                      '12ml / 1 Tola';
                    const notes =
                      [product.topNotes, product.middleNotes, product.baseNotes]
                        .filter(Boolean)
                        .join(' · ') ||
                      product.fragranceFamily ||
                      product.shortDescription ||
                      'Pure Artisanal Extraction · Natural Botanical Blend';
                    const badgeText = idx === 0 ? 'BESTSELLER' : idx === 1 ? 'ARTISANAL' : 'LIMITED';

                    return (
                      <Link
                        key={product.id}
                        to={`/product/${product.id}`}
                        onClick={onClose}
                        className="group bg-white border border-[#E4DCC8] hover:border-[#C8A55E] rounded-md p-3.5 flex flex-col justify-between transition-all shadow-3xs hover:shadow-xs"
                      >
                        <div>
                          {/* Image Frame */}
                          <div className="w-full aspect-square rounded-xs bg-[#F7F4EE] overflow-hidden relative mb-3">
                            {primaryImage ? (
                              <img
                                src={getImageUrl(primaryImage)}
                                alt={product.name}
                                className="w-full h-full object-cover transform group-hover:scale-104 transition-transform duration-500 ease-out"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-full h-full flex items-center justify-center bg-[#F7F4EE] ${
                                primaryImage ? 'hidden' : ''
                              }`}
                            >
                              <Package className="w-8 h-8 text-[#C8A55E]/40" />
                            </div>
                            {/* Floating Badge */}
                            <div className="absolute top-2 left-2">
                              <span className="bg-white/95 text-[#C8A55E] text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-xs border border-[#C8A55E]/40 shadow-3xs">
                                {badgeText}
                              </span>
                            </div>
                          </div>

                          {/* Volume & Star Rating Row */}
                          <div className="flex items-center justify-between text-[11px] text-[#8C8270] mb-1">
                            <span className="font-medium">{volume}</span>
                            <span className="text-[#C8A55E] tracking-tighter text-xs">★★★★★</span>
                          </div>

                          {/* Title */}
                          <h4 className="font-serif text-base text-[#121C2A] group-hover:text-[#C8A55E] transition-colors font-medium line-clamp-1 mb-1">
                            {product.name}
                          </h4>

                          {/* Notes */}
                          <p className="text-[11px] text-[#8C8270] line-clamp-1 font-light leading-relaxed mb-4">
                            {notes}
                          </p>
                        </div>

                        {/* Bottom Row: Price & VIEW DETAILS */}
                        <div className="flex items-center justify-between pt-3 border-t border-[#E4DCC8]/50 mt-auto">
                          <span className="font-serif text-sm font-semibold text-[#121C2A]">
                            {price > 0 ? formatPrice(price) : 'Inquire'}
                          </span>
                          <span className="text-[10px] font-semibold tracking-widest uppercase text-[#C8A55E] group-hover:text-[#121C2A] transition-colors flex items-center gap-1">
                            <span>VIEW DETAILS</span>
                            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 px-4 text-center rounded-md bg-white border border-[#E4DCC8]">
                  <Search className="w-8 h-8 text-[#8C8270]/40 mx-auto mb-2.5" />
                  <h4 className="font-serif text-base text-[#121C2A] font-normal mb-1">
                    No fragrances found for &ldquo;{searchQuery}&rdquo;
                  </h4>
                  <p className="text-xs text-[#8C8270] max-w-sm mx-auto mb-4">
                    Try checking for typos or searching by notes such as Oud, Musk, Amber, or Rose.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-1.5 rounded-full text-xs font-medium text-[#121C2A] bg-[#FAF7F0] border border-[#E4DCC8] hover:border-[#C8A55E] transition-all cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Row: Explore the complete private collection */}
            <div className="pt-8 flex justify-end">
              <Link
                to="/collection"
                onClick={onClose}
                className="text-xs font-sans text-[#121C2A] hover:text-[#C8A55E] transition-colors font-medium flex items-center gap-1.5"
              >
                <span>Explore the complete private collection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
