import React, { useEffect, useState, useMemo } from 'react';
import { Search, X, ChevronDown, Package, AlertCircle } from 'lucide-react';
import { giftSetService } from '../services/giftSetService';
import type { GiftSet } from '../types/giftSet';
import { GiftSetCard } from '../components/giftset/GiftSetCard';
import { SEO } from '../components/seo/SEO';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name-asc';
type CurationFilter = 'all' | 'for-him' | 'for-her' | 'wedding-bridal' | 'royal-oud-heritage';

const CURATION_PILLS: { id: CurationFilter; label: string }[] = [
  { id: 'all', label: 'All Curations' },
  { id: 'for-him', label: 'For Him' },
  { id: 'for-her', label: 'For Her' },
  { id: 'wedding-bridal', label: 'Wedding & Bridal' },
  { id: 'royal-oud-heritage', label: 'Royal Oud Heritage' },
];

export const GiftSets: React.FC = () => {
  const [giftSets, setGiftSets] = useState<GiftSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCuration, setActiveCuration] = useState<CurationFilter>('all');
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

    // 1. Search Query Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(gs => {
        const matchName = (gs.name || '').toLowerCase().includes(q);
        const matchDesc = (gs.description || '').toLowerCase().includes(q);
        const matchNotes = (gs.packagingNotes || '').toLowerCase().includes(q);
        const matchItems = gs.items?.some(it =>
          (it.productName || '').toLowerCase().includes(q) ||
          (it.variantSize || '').toLowerCase().includes(q)
        );
        return matchName || matchDesc || matchNotes || matchItems;
      });
    }

    // 2. Curation Pill Filter
    if (activeCuration !== 'all') {
      result = result.filter(gs => {
        const text = `${gs.name || ''} ${gs.description || ''} ${gs.packagingNotes || ''} ${
          gs.items ? gs.items.map(it => it.productName).join(' ') : ''
        }`.toLowerCase();

        switch (activeCuration) {
          case 'for-him':
            return (
              text.includes('him') ||
              text.includes('men') ||
              text.includes('musk') ||
              text.includes('oud') ||
              text.includes('spicy') ||
              text.includes('leather') ||
              text.includes('amber') ||
              text.includes('night') ||
              text.includes('wood') ||
              text.includes('vetiver') ||
              text.includes('royal')
            );
          case 'for-her':
            return (
              text.includes('her') ||
              text.includes('women') ||
              text.includes('floral') ||
              text.includes('rose') ||
              text.includes('taif') ||
              text.includes('jasmine') ||
              text.includes('white musk') ||
              text.includes('garden') ||
              text.includes('amber')
            );
          case 'wedding-bridal':
            return (
              text.includes('bridal') ||
              text.includes('wedding') ||
              text.includes('celebration') ||
              text.includes('ceremony') ||
              text.includes('coffret') ||
              text.includes('trio') ||
              text.includes('wardrobe') ||
              text.includes('collection') ||
              text.includes('gift')
            );
          case 'royal-oud-heritage':
            return (
              text.includes('oud') ||
              text.includes('royal') ||
              text.includes('heritage') ||
              text.includes('archive') ||
              text.includes('sultan') ||
              text.includes('majlis') ||
              text.includes('connoisseur') ||
              text.includes('cambodian') ||
              text.includes('ambergris')
            );
          default:
            return true;
        }
      });
    }

    // 3. Sorting
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
  }, [giftSets, searchTerm, activeCuration, sortBy]);

  return (
    <div className="w-full min-h-screen bg-[#FBF9F5] pb-24">
      <SEO
        title="Curated Fragrance Gift Sets | Al Ahad Attars"
        description="Discover luxury fragrance gift sets by Al Ahad Attars. Handcrafted presentations combining authentic attars and exquisite packaging for discerning recipients."
        canonicalUrl="/gift-sets"
      />

      {/* Hero Header Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8 sm:pt-10 pb-4">
        <div className="text-center max-w-2xl mx-auto">
          {/* Eyebrow with flanking gold hairline rules */}
          <div className="flex items-center justify-center gap-3 mb-2.5">
            <span className="w-8 sm:w-12 h-px bg-[#C8A55E]/60" aria-hidden="true" />
            <span className="text-[#A68848] text-[10.5px] font-medium uppercase tracking-[0.28em]">
              ARTISANAL PRESENTATIONS
            </span>
            <span className="w-8 sm:w-12 h-px bg-[#C8A55E]/60" aria-hidden="true" />
          </div>

          {/* Heading */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#121C2A] font-normal tracking-tight mb-3 leading-tight">
            Curated Gift Sets
          </h1>

          {/* Subtitle */}
          <p className="text-[#5A6578] font-light text-xs sm:text-sm md:text-base leading-relaxed">
            Masterfully assembled collections pairing rare attars, artisanal flacons, and rigid velvet-lined presentation boxes — designed for memorable moments and discerning recipients.
          </p>

          {/* Delicate Centered Diamond/Dot Accent */}
          <div className="flex items-center justify-center gap-2.5 mt-4 mb-7 sm:mb-9">
            <span className="w-6 h-px bg-[#C8A55E]/40" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8A55E]" />
            <span className="w-6 h-px bg-[#C8A55E]/40" />
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Filter and Control Bar (Single Cohesive Row) */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input & Curation Pills Wrapper */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-56 md:w-64 shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8270]" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search gift sets"
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-[#E4DCC8] rounded-full text-[#121C2A] placeholder:text-[#8C8270]/70 focus:border-[#C8A55E] focus:outline-none transition-colors shadow-2xs font-sans"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8C8270] hover:text-[#121C2A] p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Curation Filter Pills (Horizontally scrollable without breaking) */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
              {CURATION_PILLS.map(pill => {
                const isActive = activeCuration === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setActiveCuration(pill.id)}
                    className={`rounded-full px-3.5 py-1.5 text-xs whitespace-nowrap transition-all cursor-pointer font-sans ${
                      isActive
                        ? 'bg-white text-[#121C2A] border border-[#C8A55E] shadow-2xs font-medium'
                        : 'bg-transparent text-[#5A6578] border border-[#E4DCC8]/70 hover:border-[#C8A55E]/60 hover:text-[#121C2A]'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Controls: Sort Dropdown & Count */}
          <div className="flex items-center justify-between sm:justify-end gap-3.5 sm:gap-4 shrink-0 pt-2 lg:pt-0">
            {/* Sort Dropdown */}
            <div className="relative inline-flex items-center">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                aria-label="Sort gift sets"
                className="appearance-none bg-white border border-[#E4DCC8] rounded-full pl-3.5 pr-8 py-1.5 text-xs text-[#121C2A] focus:outline-none focus:border-[#C8A55E] cursor-pointer font-sans shadow-2xs"
              >
                <option value="featured">Featured Curations</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Alphabetical: A to Z</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#8C8270] absolute right-2.5 pointer-events-none" />
            </div>

            {/* Total Count */}
            <span className="text-xs text-[#8C8270] font-light whitespace-nowrap pl-1">
              {filteredSets.length} {filteredSets.length === 1 ? 'set' : 'sets'}
            </span>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-[#E4DCC8]/70 overflow-hidden animate-pulse flex flex-col"
              >
                <div className="aspect-[4/3.8] bg-[#F0EBD9]" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-[#E8E0CC] rounded w-1/3" />
                  <div className="h-4 bg-[#E8E0CC] rounded w-3/4" />
                  <div className="h-3 bg-[#E8E0CC] rounded w-1/2" />
                  <div className="h-5 bg-[#F0EBD9] rounded w-1/3 mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white border border-red-200 rounded-2xl p-8 text-center max-w-md mx-auto my-12 shadow-xs">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3 stroke-[1.5]" />
            <h3 className="font-serif text-lg text-[#121C2A] mb-2">Unable to Load Gift Sets</h3>
            <p className="text-xs text-[#121C2A]/70 mb-5 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={fetchGiftSets}
              className="bg-[#121C2A] text-white px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#C8A55E] hover:text-[#121C2A] transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredSets.length === 0 && (
          <div className="bg-white border border-[#E4DCC8]/80 rounded-2xl p-10 sm:p-14 text-center max-w-lg mx-auto my-12 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#FAF7F0] border border-[#E4DCC8] flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-[#C8A55E] stroke-[1.4]" />
            </div>
            <h3 className="font-serif text-xl text-[#121C2A] mb-2 font-normal">
              No Curated Sets Found
            </h3>
            <p className="text-xs text-[#5A6578] mb-6 leading-relaxed">
              We couldn't find any gift sets matching your criteria. Try adjusting your search query or curation filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setActiveCuration('all');
              }}
              className="bg-[#121C2A] text-white px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#C8A55E] hover:text-[#121C2A] transition-colors cursor-pointer shadow-xs"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* 4-Column Gift Sets Grid */}
        {!loading && !error && filteredSets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredSets.map((gs, idx) => (
              <GiftSetCard key={gs.id} giftSet={gs} index={idx} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
