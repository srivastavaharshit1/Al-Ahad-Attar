import React, { useEffect, useState, useMemo } from 'react';
import { Search, Sparkles, Filter, Package, AlertCircle } from 'lucide-react';
import { giftSetService } from '../services/giftSetService';
import type { GiftSet } from '../types/giftSet';
import { GiftSetCard } from '../components/giftset/GiftSetCard';
import { SEO } from '../components/seo/SEO';
import { Breadcrumb } from '../components/ui/Breadcrumb';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name-asc';

export const GiftSets: React.FC = () => {
  const [giftSets, setGiftSets] = useState<GiftSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  const fetchGiftSets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await giftSetService.getAllGiftSets();
      setGiftSets(data || []);
    } catch (err: any) {
      console.error('Failed to load gift sets', err);
      setError('Unable to load gift sets right now. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGiftSets();
  }, []);

  const filteredSets = useMemo(() => {
    let result = [...giftSets];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(gs => {
        const matchName = gs.name.toLowerCase().includes(q);
        const matchDesc = gs.description?.toLowerCase().includes(q);
        const matchItems = gs.items?.some(it =>
          it.productName.toLowerCase().includes(q) || it.variantSize.toLowerCase().includes(q)
        );
        return matchName || matchDesc || matchItems;
      });
    }

    // Availability filter (backend authoritative stock)
    if (inStockOnly) {
      result = result.filter(gs => gs.inStock && gs.availableStock > 0);
    }

    // Sorting
    result.sort((a, b) => {
      const priceA = a.salePrice ? Number(a.salePrice) : Number(a.price);
      const priceB = b.salePrice ? Number(b.salePrice) : Number(b.price);

      if (sortBy === 'featured') {
        if (a.featured !== b.featured) {
          return a.featured ? -1 : 1;
        }
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      }
      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [giftSets, searchTerm, inStockOnly, sortBy]);

  return (
    <div className="w-full min-h-screen bg-[#fbf9f5] pb-20">
      <SEO
        title="Curated Fragrance Gift Sets | Al Ahad Attars"
        description="Discover luxury fragrance gift sets by Al Ahad Attars. Handcrafted presentations combining authentic attars and exquisite packaging for discerning recipients."
        canonicalUrl="/gift-sets"
      />

      {/* Hero Header */}
      <div className="bg-[#f5f1e8] border-b border-[#e4dcc8] py-12 md:py-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Curated Gift Sets' },
            ]}
          />

          <div className="mt-6 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2.5 sm:gap-3 mb-3">
              <span className="w-6 h-px bg-accent/70" aria-hidden="true" />
              <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.35em] block font-medium">
                BESPOKE PRESENTATION
              </span>
              <span className="w-6 h-px bg-accent/70" aria-hidden="true" />
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-ink font-normal tracking-tight mb-4 leading-tight">
              Curated Gift Sets
            </h1>

            <p className="font-body-md text-on-surface-variant font-light text-sm sm:text-base leading-relaxed">
              Explore our masterfully assembled gift collections. Each set unites our finest fragrances within signature
              handcrafted presentation packaging, created for milestone moments and discerning recipients.
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8">
        {/* Filter and Control Bar */}
        <div className="bg-white border border-[#e4dcc8] rounded-[2px] p-4 sm:p-5 mb-8 shadow-[0_2px_12px_rgba(18,28,42,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by set name or fragrance..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#fbf9f5] border border-[#e4dcc8] rounded-[2px] text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/40 hover:text-ink"
              >
                ✕
              </button>
            )}
          </div>

          {/* Options & Sorting */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-between md:justify-end">
            {/* In stock only toggle */}
            <label className="inline-flex items-center gap-2 text-xs text-ink cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={e => setInStockOnly(e.target.checked)}
                className="w-3.5 h-3.5 text-accent rounded-xs border-[#e4dcc8] focus:ring-accent accent-accent"
              />
              <span className="font-medium tracking-wide">In Stock Only</span>
            </label>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-accent" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                aria-label="Sort gift sets"
                className="bg-[#fbf9f5] border border-[#e4dcc8] text-ink text-xs py-2 px-3 rounded-[2px] focus:border-accent focus:outline-none tracking-wide"
              >
                <option value="featured">Featured First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Alphabetical: A to Z</option>
              </select>
            </div>

            {/* Count Badge */}
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink/60 bg-[#f5f1e8] px-2.5 py-1.5 rounded-[1px] border border-[#e4dcc8]">
              {filteredSets.length} {filteredSets.length === 1 ? 'Set' : 'Sets'}
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {[1, 2, 3, 4].map(n => (
              <div
                key={n}
                className="bg-white rounded-[2px] border border-[#e4dcc8] overflow-hidden animate-pulse flex flex-col"
              >
                <div className="aspect-square bg-[#f0ebd9]" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-[#e8e0cc] rounded w-1/3 mx-auto" />
                  <div className="h-4 bg-[#e8e0cc] rounded w-3/4 mx-auto" />
                  <div className="h-3 bg-[#e8e0cc] rounded w-1/2 mx-auto" />
                  <div className="h-6 bg-[#f0ebd9] rounded w-1/3 mx-auto mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white border border-red-200 rounded-[2px] p-8 text-center max-w-md mx-auto my-12 shadow-xs">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3 stroke-[1.5]" />
            <h3 className="font-serif text-lg text-ink mb-2">Unable to Load Gift Sets</h3>
            <p className="text-xs text-ink/70 mb-5 leading-relaxed">{error}</p>
            <button
              onClick={fetchGiftSets}
              className="bg-ink text-white px-6 py-2.5 rounded-[2px] text-xs font-semibold uppercase tracking-wider hover:bg-accent hover:text-ink transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredSets.length === 0 && (
          <div className="bg-white border border-[#e4dcc8] rounded-[2px] p-12 text-center max-w-lg mx-auto my-12 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#f8f5ec] border border-[#e4dcc8] flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-accent stroke-[1.5]" />
            </div>
            <h3 className="font-serif text-xl text-ink mb-2">No Gift Sets Found</h3>
            <p className="text-xs text-ink/65 mb-6 max-w-sm mx-auto leading-relaxed">
              {searchTerm || inStockOnly
                ? "We couldn't find any gift sets matching your selected filters. Try clearing your search or filters."
                : 'Our artisans are preparing new bespoke collections. Please check back soon.'}
            </p>
            {(searchTerm || inStockOnly) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setInStockOnly(false);
                }}
                className="bg-ink text-white px-6 py-2.5 rounded-[2px] text-xs font-semibold uppercase tracking-wider hover:bg-accent hover:text-ink transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Grid of Gift Sets */}
        {!loading && !error && filteredSets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {filteredSets.map(gs => (
              <div key={gs.id} className="w-full">
                <GiftSetCard giftSet={gs} />
              </div>
            ))}
          </div>
        )}

        {/* Trust & Presentation Callout Section */}
        <div className="mt-16 md:mt-24 pt-12 border-t border-[#e4dcc8] grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="p-6 bg-white border border-[#e4dcc8]/60 rounded-[2px]">
            <Sparkles className="w-6 h-6 text-accent mx-auto mb-3" />
            <h4 className="font-serif text-base text-ink mb-1.5 font-medium">Bespoke Curation</h4>
            <p className="text-xs text-ink/65 font-light leading-relaxed">
              Each set is thoughtfully harmonized by master perfumers to complement signature olfactory profiles.
            </p>
          </div>
          <div className="p-6 bg-white border border-[#e4dcc8]/60 rounded-[2px]">
            <Package className="w-6 h-6 text-accent mx-auto mb-3" />
            <h4 className="font-serif text-base text-ink mb-1.5 font-medium">Luxury Packaging Included</h4>
            <p className="text-xs text-ink/65 font-light leading-relaxed">
              Presented in our signature rigid boxes lined with velvet inserts, ready for dignified gifting.
            </p>
          </div>
          <div className="p-6 bg-white border border-[#e4dcc8]/60 rounded-[2px]">
            <span className="material-symbols-outlined text-2xl text-accent mx-auto mb-2 block">verified</span>
            <h4 className="font-serif text-base text-ink mb-1.5 font-medium">100% Pure Attars</h4>
            <p className="text-xs text-ink/65 font-light leading-relaxed">
              Alcohol-free, authentic Arabic attars and artisanal extractions crafted with rare botanicals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

