import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { ProductCard } from '../components/product/ProductCard';
import { Pagination } from '../components/ui/Pagination';
import { Loader } from '../components/ui/Loader';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types';
import { productService } from '../services/productService';
import type { Product } from '../types';
import { useInView } from '../hooks/useInView';
import { SEO } from '../components/seo/SEO';
import { SortDropdown, normalizeSortOption, getBackendSortParam } from '../components/ui/SortDropdown';

// Maps each sidebar filter to the top-level nav collection it belongs to.
// This is the single source of truth for parent-collection resolution.
const FILTER_PARENT_ROUTE: Record<string, string> = {
  attars: '/category/attars',
  bakhoor: '/category/bakhoor',
  'incense-sticks': '/category/bakhoor',  // child of Bakhoor
  perfumes: '/category/perfumes',
  'car-perfumes': '/category/perfumes',   // child of Perfumes
};

interface CollectionProps {
  category?: string;
}

export const Collection: React.FC<CollectionProps> = ({ category }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // `category` prop comes from the route: "attars" | "bakhoor" | "perfumes" | undefined
  // It is the top-level collection and drives the Navbar active state via pathname.
  const urlCategory = searchParams.get('category');
  const activeCategory = category || urlCategory || '';
  const currentPage = parseInt(searchParams.get('page') || '0', 10);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | '' | null>(null);

  const selectedSubcategory = searchParams.get('subcategory') || '';
  const selectedGender = searchParams.get('gender') || '';
  const selectedBrand = searchParams.get('brand') || '';
  const rawSortBy = searchParams.get('sort');
  const sortBy = normalizeSortOption(rawSortBy);
  const searchQuery = searchParams.get('search') || '';

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const updateParam = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const setSelectedSubcategory = (val: string) => updateParam('subcategory', val);
  const setSelectedGender = (val: string) => updateParam('gender', val);
  const setSelectedBrand = (val: string) => updateParam('brand', val);
  const handleSortChange = (newSort: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newSort) {
        next.set('sort', newSort);
      } else {
        next.delete('sort');
      }
      next.delete('page');
      return next;
    });
  };
  const setSearchQuery = (val: string) => updateParam('search', val);

  const { ref: gridRef, inView: gridInView } = useInView(0);

  // Derived: true when the Car Perfumes sub-tab is active.
  // Used both in fetchProducts (to suppress type=PERFUME) and in JSX (to suppress defaultType).
  const isCarPerfumesTab = selectedSubcategory === 'Car Perfumes';

  // Categories rarely change — fetch the list once, not on every category switch (was doubling
  // the latency of every switch with a redundant round trip).
  useEffect(() => {
    categoryService.getActiveCategories().then(res => {
      setCategories(res.data || []);
      // If categories are truly empty, unblock the fetch
      if (!res.data || res.data.length === 0) {
        setSelectedCategoryId('');
      }
    }).catch((err) => {
      console.error(err);
      setSelectedCategoryId(''); // fallback on error to unblock product fetch
    });
  }, []);

  // Resolve the URL/prop category name to its numeric ID purely from already-loaded state — no
  // network call, so nothing here can race with a slower in-flight request from a category the
  // user has already navigated away from.
  useEffect(() => {
    if (categories.length === 0) return;

    // If activeCategory maps to a specific subcategory directly from the URL
    if (activeCategory === 'incense-sticks') {
      const bakhoorCat = categories.find(c => c.type === 'BAKHOOR');
      setSelectedCategoryId(bakhoorCat ? bakhoorCat.id : '');
      setSelectedSubcategory('Incense Sticks');
    } else if (activeCategory === 'car-perfumes') {
      const perfumeCat = categories.find(c => c.type === 'PERFUMES');
      setSelectedCategoryId(perfumeCat ? perfumeCat.id : '');
      setSelectedSubcategory('Car Perfumes');
    } else {
      // Map back to category normally
      const normalizedActive = activeCategory.toLowerCase().replace(/\s+/g, '-');
      const match = categories.find(
        (c: Category) => c.name.toLowerCase().replace(/\s+/g, '-') === normalizedActive
      );
      setSelectedCategoryId(match ? match.id : '');
    }
  }, [activeCategory, categories]);

  // URL-based state eliminates the need for location.state.subfilter.
  // The subcategory is natively read from searchParams above.

  useEffect(() => {
    if (selectedCategoryId === null) return;
    fetchProducts();
  }, [selectedCategoryId, selectedSubcategory, selectedGender, selectedBrand, sortBy, searchQuery, currentPage]);

  // Since Collection is reused (not remounted) across /collections, /category/attars,
  // /category/bakhoor etc., a slow response from a category the user already switched away from
  // must never overwrite the products of the category currently on screen. requestId guards that.
  const fetchIdRef = useRef(0);

  const fetchProducts = async () => {
    const requestId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const backendSort = getBackendSortParam(sortBy);
      const params: Record<string, any> = {
        // /api/products has no active-only default (the admin product list reuses the same
        // endpoint and needs to see inactive/deleted products too) — the public collection page
        // has to ask for active=true explicitly, or deactivated products show up in browsing.
        active: true,
        sort: backendSort,
        size: 24,
        page: currentPage
      };

      let type = searchParams.get('type');
      // Car Perfumes sub-tab: do NOT send type=PERFUME.
      // Car Perfumes membership is determined solely by subcategory='Car Perfumes'
      // (strict category match). Sending type=PERFUME would trigger the backend's
      // broad variant-OR path and pull in any product with a PERFUME variant.
      if (!type && selectedCategoryId && !isCarPerfumesTab) {
        const cat = categories.find(c => c.id === selectedCategoryId);
        if (cat) {
          if (cat.type === 'PERFUMES') type = 'PERFUME';
          else if (cat.type === 'ATTARS') type = 'ATTAR';
        }
      }
      if (type) params.type = type;
      if (selectedCategoryId) params.categoryId = selectedCategoryId;
      if (selectedSubcategory) params.subcategory = selectedSubcategory;
      if (selectedGender) params.gender = selectedGender;
      if (selectedBrand) params.brand = selectedBrand;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await productService.getProducts(params);
      if (fetchIdRef.current !== requestId) return;
      setProducts(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (err) {
      if (fetchIdRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      if (fetchIdRef.current === requestId) setIsLoading(false);
    }
  };

  // Memoized, non-mutating sorted products for consistent client-side display safety
  const displayProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const copy = [...products];
    switch (sortBy) {
      case 'name,asc':
        return copy.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
      case 'name,desc':
        return copy.sort((a, b) => (b.name || '').localeCompare(a.name || '', undefined, { numeric: true, sensitivity: 'base' }));
      case 'price,asc':
        return copy.sort((a, b) => {
          const pa = a.minimumPrice != null ? Number(a.minimumPrice) : Infinity;
          const pb = b.minimumPrice != null ? Number(b.minimumPrice) : Infinity;
          return pa - pb;
        });
      case 'price,desc':
        return copy.sort((a, b) => {
          const pa = a.minimumPrice != null ? Number(a.minimumPrice) : -Infinity;
          const pb = b.minimumPrice != null ? Number(b.minimumPrice) : -Infinity;
          return pb - pa;
        });
      case 'createdAt,desc':
        return copy.sort((a, b) => {
          const da = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
          const db = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
          if (da && db) return db - da;
          return 0; // retain backend order
        });
      default:
        return copy;
    }
  }, [products, sortBy]);

  // Changing a filter invalidates the current page (e.g. being on page 3 of an
  // unfiltered list, then filtering down to 1 page, would otherwise request a
  // page that no longer exists and show a false "no products found").
  const resetPage = () => {
    setSearchParams(prev => {
      prev.delete('page');
      return prev;
    });
  };

  // Handle sidebar filter selection.
  // When a filter changes the parent collection (e.g., clicking "Perfumes" while on Bakhoor),
  // navigate to the parent collection route. This keeps the Navbar's pathname-based active
  // detection in sync — no secondary state needed.
  const handleSidebarFilter = (filterId: string) => {
    const parentRoute = FILTER_PARENT_ROUTE[filterId];

    if (filterId === 'all') {
      // "All" means all products in the CURRENT top-level collection, not global all.
      // Reset subcategory filter; categoryId is already scoped to the current collection.
      setSelectedSubcategory('');
      resetPage();
      return;
    }

    if (filterId === 'attars') {
      if (location.pathname !== '/category/attars') {
        navigate('/category/attars');
      } else {
        // Already on attars; just clear sub-filter
        const attarsCat = categories.find(c => c.type === 'ATTARS');
        setSelectedCategoryId(attarsCat?.id ?? '');
        setSelectedSubcategory('');
        resetPage();
      }
      return;
    }

    if (filterId === 'bakhoor') {
      if (location.pathname !== '/category/bakhoor') {
        navigate('/category/bakhoor');
      } else {
        const bakhoorCat = categories.find(c => c.type === 'BAKHOOR');
        setSelectedCategoryId(bakhoorCat?.id ?? '');
        setSelectedSubcategory('');
        resetPage();
      }
      return;
    }

    if (filterId === 'incense-sticks') {
      if (location.pathname !== '/category/bakhoor') {
        navigate('/category/bakhoor?subcategory=Incense+Sticks');
      } else {
        const bakhoorCat = categories.find(c => c.type === 'BAKHOOR');
        setSelectedCategoryId(bakhoorCat?.id ?? '');
        setSearchParams(prev => { prev.set('subcategory', 'Incense Sticks'); prev.delete('page'); return prev; });
      }
      return;
    }

    if (filterId === 'perfumes') {
      if (location.pathname !== '/category/perfumes') {
        navigate('/category/perfumes');
      } else {
        const perfumeCat = categories.find(c => c.type === 'PERFUMES');
        setSelectedCategoryId(perfumeCat?.id ?? '');
        setSearchParams(prev => { prev.delete('subcategory'); prev.delete('page'); return prev; });
      }
      return;
    }

    if (filterId === 'car-perfumes') {
      if (location.pathname !== '/category/perfumes') {
        navigate('/category/perfumes?subcategory=Car+Perfumes');
      } else {
        const perfumeCat = categories.find(c => c.type === 'PERFUMES');
        setSelectedCategoryId(perfumeCat?.id ?? '');
        setSearchParams(prev => { prev.set('subcategory', 'Car Perfumes'); prev.delete('page'); return prev; });
      }
      return;
    }

    // Fallback (shouldn't be reached)
    if (parentRoute && location.pathname !== parentRoute) {
      navigate(parentRoute);
    }
  };

  const clearFilters = () => {
    setSelectedCategoryId(activeCategory ? selectedCategoryId : '');
    setSearchParams(prev => {
      prev.delete('subcategory');
      prev.delete('gender');
      prev.delete('brand');
      prev.delete('search');
      prev.delete('sort');
      prev.delete('page');
      return prev;
    });
  };

  const handlePageChange = (page: number) => {
    // Preserve other search params when changing page
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Derive which sidebar filter is currently checked based on categoryId + subcategory.
  // This is the single place that maps current state → active sidebar filter.
  const activeSidebarFilter = (() => {
    if (selectedCategoryId === '' || selectedCategoryId === null) return 'all';
    const cat = categories.find(c => c.id === selectedCategoryId);
    if (!cat) return 'all';
    if (cat.type === 'ATTARS') return 'attars';
    if (cat.type === 'BAKHOOR') {
      return selectedSubcategory === 'Incense Sticks' ? 'incense-sticks' : 'bakhoor';
    }
    if (cat.type === 'PERFUMES') {
      return selectedSubcategory === 'Car Perfumes' ? 'car-perfumes' : 'perfumes';
    }
    return 'all';
  })();

  const hasActiveFilters = (selectedCategoryId !== '' && selectedCategoryId !== null) || selectedGender !== '' || selectedBrand !== '' || searchQuery !== '';
  const hasUserFilters = selectedGender !== '' || selectedBrand !== '' || searchQuery !== '';

  // Page title: prefer the more specific sidebar filter label, fall back to top-level collection.
  const pageTitleMap: Record<string, string> = {
    attars: 'Attars Collection',
    bakhoor: 'Bakhoor Collection',
    'incense-sticks': 'Incense Sticks Collection',
    perfumes: 'Perfumes Collection',
    'car-perfumes': 'Car Perfumes Collection',
    all: activeCategory
      ? `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Collection`
      : 'Our Collection',
  };
  const pageTitle = pageTitleMap[activeSidebarFilter] ?? pageTitleMap.all;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://alahadattars.com/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": pageTitle,
        "item": activeCategory ? `https://alahadattars.com/collection?category=${activeCategory}` : "https://alahadattars.com/collection"
      }
    ]
  };

  const selectedCatName = categories.find(c => c.id === selectedCategoryId)?.name?.toLowerCase();

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-16">
      <SEO
        title={`${pageTitle} | Al Ahad Attars`}
        description={`Explore our exclusive ${pageTitle}. Buy premium Arabic attars and perfumes online.`}
        canonicalUrl={activeCategory ? `/collection?category=${activeCategory}` : "/collection"}
        schema={breadcrumbSchema}
      />

      <header className="mb-10 md:mb-14">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: activeCategory ? activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1) : 'Collection' }
          ]}
        />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
          <div>
            <span className="text-accent text-[11px] font-semibold uppercase tracking-[0.3em] mb-2.5 block">
              Signature Fragrances
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-ink font-normal tracking-tight">
              {pageTitle}
            </h1>
            <p className="font-body-md text-sm sm:text-base text-ink/70 mt-3 max-w-2xl leading-relaxed font-light">
              Discover our curated selection of artisanal fragrances, masterfully blended following centuries-old Arabian traditions.
            </p>
          </div>
          <div className="hidden md:flex items-center shrink-0">
            <SortDropdown
              value={sortBy}
              onChange={handleSortChange}
              id="desktop-sort-dropdown"
              showLabel={true}
            />
          </div>
        </div>
      </header>

      {/* Subcategory Pills for Bakhoor */}
      {selectedCategoryId !== '' && selectedCategoryId !== null && selectedCatName === 'bakhoor' && (
        <div className="flex justify-center mb-10 flex-wrap gap-2">
          <div className="inline-flex flex-wrap justify-center bg-surface-container-lowest border border-[#e4dcc8] rounded-full p-1 max-w-full shadow-xs">
            <button
              onClick={() => setSearchParams(prev => { prev.delete('subcategory'); prev.delete('page'); return prev; })}
              className={`px-5 py-1.5 rounded-full text-xs uppercase tracking-wider font-medium transition-all ${
                selectedSubcategory === ''
                  ? 'bg-ink text-surface shadow-xs'
                  : 'text-ink/70 hover:text-ink'
              }`}
            >
              Bakhoor
            </button>
            <button
              onClick={() => setSearchParams(prev => { prev.set('subcategory', 'Incense Sticks'); prev.delete('page'); return prev; })}
              className={`px-5 py-1.5 rounded-full text-xs uppercase tracking-wider font-medium transition-all ${
                selectedSubcategory === 'Incense Sticks'
                  ? 'bg-ink text-surface shadow-xs'
                  : 'text-ink/70 hover:text-ink'
              }`}
            >
              Incense Sticks
            </button>
          </div>
        </div>
      )}

      {/* Subcategory Pills for Perfumes */}
      {selectedCategoryId !== '' && selectedCategoryId !== null && selectedCatName === 'perfumes' && (
        <div className="flex justify-center mb-10 flex-wrap gap-2">
          <div className="inline-flex flex-wrap justify-center bg-surface-container-lowest border border-[#e4dcc8] rounded-full p-1 max-w-full shadow-xs">
            <button
              onClick={() => setSearchParams(prev => { prev.delete('subcategory'); prev.delete('page'); return prev; })}
              className={`px-5 py-1.5 rounded-full text-xs uppercase tracking-wider font-medium transition-all ${
                selectedSubcategory === ''
                  ? 'bg-ink text-surface shadow-xs'
                  : 'text-ink/70 hover:text-ink'
              }`}
            >
              Perfumes
            </button>
            <button
              onClick={() => setSearchParams(prev => { prev.set('subcategory', 'Car Perfumes'); prev.delete('page'); return prev; })}
              className={`px-5 py-1.5 rounded-full text-xs uppercase tracking-wider font-medium transition-all ${
                selectedSubcategory === 'Car Perfumes'
                  ? 'bg-ink text-surface shadow-xs'
                  : 'text-ink/70 hover:text-ink'
              }`}
            >
              Car Perfumes
            </button>
          </div>
        </div>
      )}

      {/* Mobile Filter & Sort Bar (Visible on mobile/tablet) */}
      <div className="flex md:hidden items-center justify-between gap-3 mb-6 pb-4 border-b border-[#e4dcc8]">
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-sm bg-surface-container-lowest border border-[#e4dcc8] text-ink font-medium text-xs uppercase tracking-wider hover:border-accent transition-all shadow-xs"
        >
          <span className="material-symbols-outlined text-[18px] text-accent">tune</span>
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-5 h-5 rounded-full bg-ink text-surface text-[10px] font-bold flex items-center justify-center">
              {[
                activeSidebarFilter !== 'all' ? 1 : 0,
                selectedGender ? 1 : 0,
                selectedBrand ? 1 : 0,
                searchQuery ? 1 : 0
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </button>

        <SortDropdown
          value={sortBy}
          onChange={handleSortChange}
          id="mobile-sort-dropdown"
          showLabel={false}
        />
      </div>

      {/* Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/60 backdrop-blur-xs transition-opacity duration-300 md:hidden">
          <div
            className="w-full max-w-xs h-full bg-[#fbf9f5] flex flex-col shadow-2xl overflow-hidden animate-slide-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#e4dcc8] bg-surface">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-accent text-[20px]">tune</span>
                <span className="font-serif text-lg text-ink font-medium">Filter Fragrances</span>
              </div>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors"
                aria-label="Close filters"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* Category Filter */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent mb-4 border-b border-[#e4dcc8] pb-2">
                  Category
                </h4>
                <div className="space-y-3">
                  {[
                    { id: 'all', name: 'All Collections' },
                    { id: 'attars', name: 'Attars' },
                    { id: 'bakhoor', name: 'Bakhoor' },
                    { id: 'incense-sticks', name: 'Incense Sticks' },
                    { id: 'perfumes', name: 'Perfumes' },
                    { id: 'car-perfumes', name: 'Car Perfumes' }
                  ].map(cat => {
                    const isChecked = activeSidebarFilter === cat.id;
                    return (
                      <label key={cat.id} className="flex items-center group cursor-pointer py-1">
                        <input
                          type="radio"
                          name="mobile_category"
                          checked={isChecked}
                          onChange={() => {
                            handleSidebarFilter(cat.id);
                            setIsMobileFilterOpen(false);
                          }}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          isChecked ? 'border-accent bg-accent/20' : 'border-[#d0c6b0] group-hover:border-accent'
                        }`}>
                          <div className={`w-2 h-2 rounded-full bg-accent transition-transform duration-200 ${isChecked ? 'scale-100' : 'scale-0'}`} />
                        </div>
                        <span className={`ml-3 text-sm transition-colors ${isChecked ? 'text-ink font-semibold' : 'text-ink/70 group-hover:text-ink'}`}>
                          {cat.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Gender Filter */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent mb-4 border-b border-[#e4dcc8] pb-2">
                  Gender
                </h4>
                <div className="space-y-3">
                  {['', 'UNISEX', 'MALE', 'FEMALE'].map(g => {
                    const isChecked = selectedGender === g;
                    return (
                      <label key={g} className="flex items-center group cursor-pointer py-1">
                        <input
                          type="radio"
                          name="mobile_gender"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedGender(g);
                            resetPage();
                            setIsMobileFilterOpen(false);
                          }}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          isChecked ? 'border-accent bg-accent/20' : 'border-[#d0c6b0] group-hover:border-accent'
                        }`}>
                          <div className={`w-2 h-2 rounded-full bg-accent transition-transform duration-200 ${isChecked ? 'scale-100' : 'scale-0'}`} />
                        </div>
                        <span className={`ml-3 text-sm transition-colors ${isChecked ? 'text-ink font-semibold' : 'text-ink/70 group-hover:text-ink'}`}>
                          {g === '' ? 'All' : g.charAt(0) + g.slice(1).toLowerCase()}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#e4dcc8] bg-surface flex gap-3">
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    clearFilters();
                    setIsMobileFilterOpen(false);
                  }}
                  className="flex-1 py-3 text-xs uppercase tracking-wider font-semibold text-ink/70 border border-[#e4dcc8] rounded-sm hover:bg-ink/5 transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-3 text-xs uppercase tracking-wider font-semibold text-surface bg-ink rounded-sm hover:bg-ink/90 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-32 space-y-9 pr-6 border-r border-[#e4dcc8]">

          {/* Category Filter */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-5 border-b border-[#e4dcc8] pb-2.5">
              Category
            </h3>
            <div className="space-y-3">
              {[
                { id: 'all', name: 'All Collections' },
                { id: 'attars', name: 'Attars' },
                { id: 'bakhoor', name: 'Bakhoor' },
                { id: 'incense-sticks', name: 'Incense Sticks' },
                { id: 'perfumes', name: 'Perfumes' },
                { id: 'car-perfumes', name: 'Car Perfumes' }
              ].map(cat => {
                const isChecked = activeSidebarFilter === cat.id;

                return (
                  <label key={cat.id} className="flex items-center group cursor-pointer py-0.5">
                    <input
                      type="radio"
                      name="category"
                      checked={isChecked}
                      onChange={() => handleSidebarFilter(cat.id)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      isChecked ? 'border-accent bg-accent/20' : 'border-[#d0c6b0] group-hover:border-accent'
                    }`}>
                      <div className={`w-2 h-2 rounded-full bg-accent transition-transform duration-200 ${isChecked ? 'scale-100' : 'scale-0'}`} />
                    </div>
                    <span className={`ml-3 text-sm transition-colors ${isChecked ? 'text-ink font-semibold' : 'text-ink/70 group-hover:text-ink'}`}>
                      {cat.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Gender Filter */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-5 border-b border-[#e4dcc8] pb-2.5">
              Gender
            </h3>
            <div className="space-y-3">
              {['', 'UNISEX', 'MALE', 'FEMALE'].map(g => {
                const isChecked = selectedGender === g;
                return (
                  <label key={g} className="flex items-center group cursor-pointer py-0.5">
                    <input
                      type="radio"
                      name="gender"
                      checked={isChecked}
                      onChange={() => { setSelectedGender(g); resetPage(); }}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      isChecked ? 'border-accent bg-accent/20' : 'border-[#d0c6b0] group-hover:border-accent'
                    }`}>
                      <div className={`w-2 h-2 rounded-full bg-accent transition-transform duration-200 ${isChecked ? 'scale-100' : 'scale-0'}`} />
                    </div>
                    <span className={`ml-3 text-sm transition-colors ${isChecked ? 'text-ink font-semibold' : 'text-ink/70 group-hover:text-ink'}`}>
                      {g === '' ? 'All' : g.charAt(0) + g.slice(1).toLowerCase()}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full text-center text-xs font-semibold uppercase tracking-wider text-ink/70 border border-[#e4dcc8] rounded-sm py-2.5 transition-all hover:bg-ink/5 hover:text-ink hover:border-ink/30"
            >
              Clear All Filters
            </button>
          )}
        </aside>

        {/* Product Grid Area */}
        <div className="col-span-1 lg:col-span-9">
          {/* Active Filter Chips */}
          {(activeSidebarFilter !== 'all' || selectedGender || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-[11px] uppercase tracking-wider text-ink/50 font-medium mr-1">Active:</span>
              {activeSidebarFilter !== 'all' && (
                <button
                  onClick={() => handleSidebarFilter('all')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-accent/10 border border-accent/30 text-ink hover:bg-accent/20 transition-colors"
                >
                  <span>{pageTitleMap[activeSidebarFilter] || activeSidebarFilter}</span>
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
              {selectedGender && (
                <button
                  onClick={() => { setSelectedGender(''); resetPage(); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-accent/10 border border-accent/30 text-ink hover:bg-accent/20 transition-colors"
                >
                  <span>Gender: {selectedGender.charAt(0) + selectedGender.slice(1).toLowerCase()}</span>
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); resetPage(); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-accent/10 border border-accent/30 text-ink hover:bg-accent/20 transition-colors"
                >
                  <span>Search: "{searchQuery}"</span>
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
              <button
                onClick={clearFilters}
                className="text-[11px] font-medium text-accent hover:underline uppercase tracking-wider ml-1"
              >
                Clear All
              </button>
            </div>
          )}

          {isLoading ? (
            <Loader />
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-center py-20 md:py-24">
              <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-accent text-2xl">error_outline</span>
              </div>
              <h3 className="font-serif text-2xl text-ink mb-2">Something went wrong</h3>
              <p className="font-body-md text-sm text-ink/70 mb-8 max-w-sm leading-relaxed">
                We’re having trouble loading the collection right now. Please try again in a moment.
              </p>
              <button onClick={fetchProducts} className="btn btn-primary">TRY AGAIN</button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 md:py-24">
              <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
                {hasUserFilters ? (
                  <span className="material-symbols-outlined text-accent text-2xl">inventory_2</span>
                ) : (
                  <span className="material-symbols-outlined text-accent text-2xl">hourglass_empty</span>
                )}
              </div>
              <h3 className="font-serif text-2xl text-ink mb-2">
                {hasUserFilters ? "No Fragrances Found" : "Collection Coming Soon"}
              </h3>
              <p className="font-body-md text-sm text-ink/70 mb-8 max-w-sm leading-relaxed">
                {hasUserFilters
                  ? "No products matched your selected filters. Try adjusting your search criteria."
                  : "We are currently curating exclusive artisanal blends for this collection. Please check back shortly."}
              </p>
              {hasUserFilters && (
                <button
                  onClick={() => {
                    setSelectedGender('');
                    setSelectedBrand('');
                    setSearchQuery('');
                    resetPage();
                  }}
                  className="btn btn-primary"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-xs text-ink/60 font-medium tracking-wide">
                  Showing <span className="text-ink font-semibold">{displayProducts.length}</span> of <span className="text-ink font-semibold">{totalElements}</span> handcrafted fragrances
                </p>
              </div>

              <div
                ref={gridRef}
                className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 lg:gap-7 reveal ${gridInView ? 'in-view' : ''}`}
              >
                {displayProducts.map(product => {
                  let cardDefaultType: string | undefined;
                  if (isCarPerfumesTab) {
                    cardDefaultType = 'car perfume';
                  } else {
                    const selectedCat = categories.find(c => c.id === selectedCategoryId);
                    cardDefaultType = searchParams.get('type') ||
                      (selectedCat?.type === 'PERFUMES' ? 'perfume'
                        : selectedCat?.type === 'ATTARS' ? 'attar'
                        : undefined) || undefined;
                  }
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      defaultType={cardDefaultType}
                    />
                  );
                })}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="mt-16 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
