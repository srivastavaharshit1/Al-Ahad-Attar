import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { ProductCard } from '../components/product/ProductCard';
import { Pagination } from '../components/ui/Pagination';
import { Loader } from '../components/ui/Loader';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types';
import { productService } from '../services/productService';
import type { Product } from '../types';
import { useInView } from '../hooks/useInView';

interface CollectionProps {
  category?: string;
}

export const Collection: React.FC<CollectionProps> = ({ category }) => {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [sortBy, setSortBy] = useState('createdAt,desc');
  const [searchQuery, setSearchQuery] = useState('');

  const { ref: gridRef, inView: gridInView } = useInView();

  // Categories rarely change — fetch the list once, not on every category switch (was doubling
  // the latency of every switch with a redundant round trip).
  useEffect(() => {
    categoryService.getActiveCategories().then(res => {
      setCategories(res.data || []);
    }).catch(console.error);
  }, []);

  // Resolve the URL/prop category name to its numeric ID purely from already-loaded state — no
  // network call, so nothing here can race with a slower in-flight request from a category the
  // user has already navigated away from.
  useEffect(() => {
    if (!activeCategory) {
      setSelectedCategoryId('');
      return;
    }
    const normalizedActive = activeCategory.toLowerCase().replace(/\s+/g, '-');
    const match = categories.find(
      (c: Category) => c.name.toLowerCase().replace(/\s+/g, '-') === normalizedActive
    );
    setSelectedCategoryId(match ? match.id : '');
    setSelectedSubcategory('');
  }, [activeCategory, categories]);

  useEffect(() => {
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
      const [sortField, sortDir] = sortBy.split(',');
      const params: Record<string, any> = {
        // /api/products has no active-only default (the admin product list reuses the same
        // endpoint and needs to see inactive/deleted products too) — the public collection page
        // has to ask for active=true explicitly, or deactivated products show up in browsing.
        active: true,
        sort: `${sortField},${sortDir}`,
        size: 24,
        page: currentPage
      };
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

  // Changing a filter invalidates the current page (e.g. being on page 3 of an
  // unfiltered list, then filtering down to 1 page, would otherwise request a
  // page that no longer exists and show a false "no products found").
  const resetPage = () => {
    setSearchParams(prev => {
      prev.delete('page');
      return prev;
    });
  };

  const handleCategoryChange = (catId: number | '') => {
    setSelectedCategoryId(catId);
    resetPage();
  };

  const clearFilters = () => {
    setSelectedCategoryId('');
    setSelectedSubcategory('');
    setSelectedGender('');
    setSelectedBrand('');
    setSearchQuery('');
    setSortBy('createdAt,desc');
    resetPage();
  };

  const handlePageChange = (page: number) => {
    // Preserve other search params when changing page
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = selectedCategoryId !== '' || selectedGender !== '' || selectedBrand !== '' || searchQuery !== '';

  const pageTitle = activeCategory
    ? `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Collection`
    : 'Our Collection';

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-16">
      <header className="mb-12 md:mb-16">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: activeCategory ? activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1) : 'Collection' }
          ]}
        />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-3 block">Signature Fragrances</span>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface">
              {pageTitle}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-4 max-w-2xl leading-relaxed">
              Discover our curated selection of artisanal fragrances, masterfully blended following centuries-old traditions.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase">Sort By</span>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); resetPage(); }}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md text-body-md rounded-DEFAULT py-2 pl-4 pr-10 transition-colors hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              <option value="createdAt,desc">Newest</option>
              <option value="price,asc">Price: Low to High</option>
              <option value="price,desc">Price: High to Low</option>
              <option value="name,asc">Name: A–Z</option>
            </select>
          </div>
        </div>
      </header>

      {/* Bakhoor Subcategories */}
      {(activeCategory === 'bakhoor' || categories.find(c => c.id === selectedCategoryId)?.type === 'BAKHOOR') && (
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-surface-container-lowest border border-outline-variant/30 rounded-full p-1">
            <button
              onClick={() => { setSelectedSubcategory(''); setSearchParams(prev => { prev.delete('page'); return prev; }); }}
              className={`px-8 py-2.5 rounded-full font-label-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                selectedSubcategory === ''
                  ? 'bg-accent-soft text-accent-hover'
                  : 'text-on-surface-variant hover:text-accent'
              }`}
            >
              All Bakhoor
            </button>
            <button
              onClick={() => { setSelectedSubcategory('BAKHOOR'); setSearchParams(prev => { prev.delete('page'); return prev; }); }}
              className={`px-8 py-2.5 rounded-full font-label-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                selectedSubcategory === 'BAKHOOR'
                  ? 'bg-accent-soft text-accent-hover'
                  : 'text-on-surface-variant hover:text-accent'
              }`}
            >
              Bakhoor
            </button>
            <button
              onClick={() => { setSelectedSubcategory('FRESHENERS'); setSearchParams(prev => { prev.delete('page'); return prev; }); }}
              className={`px-8 py-2.5 rounded-full font-label-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                selectedSubcategory === 'FRESHENERS'
                  ? 'bg-accent-soft text-accent-hover'
                  : 'text-on-surface-variant hover:text-accent'
              }`}
            >
              Fresheners
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Sidebar Filters */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-32 space-y-10 pr-8 border-r border-outline-variant/30">

          {/* Category Filter */}
          <div>
            <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface mb-6 border-b border-outline-variant/30 pb-2">Category</h3>
            <div className="space-y-3">
              <label className="flex items-center group cursor-pointer">
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategoryId === ''}
                  onChange={() => handleCategoryChange('')}
                  className="w-4 h-4 border-outline-variant text-accent focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 cursor-pointer"
                />
                <span className="ml-3 font-body-md text-body-md text-on-surface-variant group-hover:text-accent transition-colors">All</span>
              </label>
              {categories.map(cat => (
                <label key={cat.id} className="flex items-center group cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategoryId === cat.id}
                    onChange={() => handleCategoryChange(cat.id)}
                    className="w-4 h-4 border-outline-variant text-accent focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 cursor-pointer"
                  />
                  <span className="ml-3 font-body-md text-body-md text-on-surface-variant group-hover:text-accent transition-colors">{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Gender Filter */}
          <div>
            <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface mb-6 border-b border-outline-variant/30 pb-2">Gender</h3>
            <div className="space-y-3">
              {['', 'UNISEX', 'MALE', 'FEMALE'].map(g => (
                <label key={g} className="flex items-center group cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    checked={selectedGender === g}
                    onChange={() => { setSelectedGender(g); resetPage(); }}
                    className="w-4 h-4 border-outline-variant text-accent focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 cursor-pointer"
                  />
                  <span className="ml-3 font-body-md text-body-md text-on-surface-variant group-hover:text-accent transition-colors">
                    {g === '' ? 'All' : g.charAt(0) + g.slice(1).toLowerCase()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full text-center font-label-sm text-label-sm text-error border border-error rounded-DEFAULT py-2 transition-colors hover:bg-error-container/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2"
            >
              Clear All Filters
            </button>
          )}
        </aside>

        {/* Product Grid */}
        <div className="col-span-1 lg:col-span-9">
          {isLoading ? (
            <Loader />
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-center py-20 md:py-24">
              <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-accent text-2xl">error_outline</span>
              </div>
              <h3 className="font-headline-md text-on-surface mb-2 tracking-widest uppercase text-lg">Connection Error</h3>
              <p className="font-body-md text-on-surface-variant mb-8 max-w-sm leading-relaxed">{error}</p>
              <button onClick={fetchProducts} className="btn btn-primary">Retry</button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 md:py-24">
              <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-accent text-2xl">inventory_2</span>
              </div>
              <h3 className="font-headline-md text-on-surface mb-2 tracking-widest uppercase text-lg">No Products Found</h3>
              <p className="font-body-md text-on-surface-variant mb-8 max-w-sm leading-relaxed">No products matched your filters. Try adjusting your search criteria.</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="btn btn-primary">
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="font-label-sm text-on-surface-variant mb-6">{totalElements} products found</p>
              <div
                ref={gridRef}
                className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 reveal ${gridInView ? 'in-view' : ''}`}
              >
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
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
