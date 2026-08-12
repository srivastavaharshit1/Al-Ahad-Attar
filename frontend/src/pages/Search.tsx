import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import type { Product, Category } from '../types';
import { formatPrice } from '../utils/formatPrice';
import { getImageUrl } from '../utils/getImageUrl';
import { Pagination } from '../components/ui/Pagination';
import { Loader } from '../components/ui/Loader';
import { useInView } from '../hooks/useInView';


export const Search: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategoryId = searchParams.get('category') || '';
  const currentPage = parseInt(searchParams.get('page') || '0', 10);

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId);
  const [sort, setSort] = useState(searchParams.get('sort') || 'createdAt,desc');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const [results, setResults] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const { ref: gridRef, inView: gridInView } = useInView();

  useEffect(() => {
    // Fetch categories for the filter sidebar
    categoryService.getActiveCategories().then(res => {
      setCategories(res.data || []);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    // Sync URL to State when URL changes externally
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('category') || '';
    const s = searchParams.get('sort') || 'createdAt,desc';

    setQuery(q);
    setSelectedCategoryId(cat);
    setSort(s);

    performSearch(q, cat, s, currentPage);
  }, [searchParams]);

  const performSearch = async (searchQuery: string, categoryId: string, sortVal: string, page: number) => {
    try {
      setIsLoading(true);
      // /api/products applies no active filter unless asked (the admin product list reuses this
      // same endpoint and needs to see inactive products too) — must ask explicitly here or
      // deactivated/deleted products show up in public search results.
      const params: Record<string, any> = { active: true, sort: sortVal, page, size: 24 };
      if (searchQuery) params.search = searchQuery;
      if (categoryId) params.categoryId = categoryId;

      const res = await productService.getProducts(params);
      setResults(res.content || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
    } catch (error) {
      console.error('Search failed', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUrlParams = (newQuery: string, newCategoryId: string, newSort: string, newPage?: number) => {
    const params = new URLSearchParams(searchParams);
    if (newQuery) params.set('q', newQuery);
    else params.delete('q');

    if (newCategoryId) params.set('category', newCategoryId);
    else params.delete('category');

    if (newSort !== 'createdAt,desc') params.set('sort', newSort);
    else params.delete('sort');

    if (newPage !== undefined) {
      params.set('page', newPage.toString());
    } else {
      params.delete('page');
    }

    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams(query, selectedCategoryId, sort, 0);
  };

  const handleCategoryChange = (categoryId: string) => {
    const newCat = selectedCategoryId === categoryId ? '' : categoryId;
    setSelectedCategoryId(newCat);
    updateUrlParams(query, newCat, sort);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    setSort(newSort);
    updateUrlParams(query, selectedCategoryId, newSort, 0);
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedCategoryId('');
    setSort('createdAt,desc');
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (page: number) => {
    updateUrlParams(query, selectedCategoryId, sort, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // /api/products (what this page's productService.getProducts hits) actually returns the
  // lightweight ProductSummaryResponse shape (thumbnail/minimumPrice), not the full Product shape
  // (variants/images) this file is typed against — check both, same as admin/Products.tsx does.
  const getProductImage = (product: Product) => {
    return (product as any).thumbnail || product.variants?.[0]?.image || '';
  };

  const getProductPrice = (product: Product) => {
    return product.minimumPrice || product.variants?.[0]?.price || 0;
  };

  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 md:py-16 min-h-screen">
      <div className="mb-12 text-center">
        <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-3 block">Discover</span>
        <h1 className="font-display-sm text-display-sm text-on-surface mb-6">Search Results</h1>
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for attars, bakhoor, perfumes..."
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-full pl-6 pr-14 py-4 shadow-sm transition-colors hover:border-accent focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          />
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center transition-colors hover:bg-accent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <span className="material-symbols-outlined text-sm">search</span>
          </button>
        </form>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT p-6 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline-sm">Filters</h2>
              <button
                onClick={clearFilters}
                className="text-sm text-on-surface-variant transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-sm"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-label-lg mb-3">Categories</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {categories.map(category => (
                    <label key={category.id} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedCategoryId === category.id.toString()}
                        onChange={() => handleCategoryChange(category.id.toString())}
                        className="rounded text-accent border-outline-variant focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                      />
                      <span className="font-body-md text-on-surface-variant group-hover:text-accent transition-colors">{category.name}</span>
                    </label>
                  ))}
                  {categories.length === 0 && (
                    <div className="text-on-surface-variant text-sm">Loading categories...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-grow">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <p className="font-body-md text-on-surface-variant leading-relaxed">
              Showing {totalElements} results {query && <span>for "<span className="font-medium text-on-surface">{query}</span>"</span>}
            </p>
            <div className="flex items-center gap-4">
              <select
                value={sort}
                onChange={handleSortChange}
                className="bg-surface border border-outline-variant rounded px-4 py-2 text-sm transition-colors hover:border-accent focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                <option value="createdAt,desc">Newest Arrivals</option>
                <option value="createdAt,asc">Oldest First</option>
                <option value="price,asc">Price: Low to High</option>
                <option value="price,desc">Price: High to Low</option>
              </select>

              <div className="hidden sm:flex border border-outline-variant rounded overflow-hidden">
                <button
                  onClick={() => setView('grid')}
                  aria-label="Grid view"
                  aria-pressed={view === 'grid'}
                  className={`px-3 py-2 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${view === 'grid' ? 'bg-accent-soft text-accent-hover' : 'bg-surface hover:bg-surface-container-low text-on-surface-variant'}`}
                >
                  <span className="material-symbols-outlined text-sm">grid_view</span>
                </button>
                <button
                  onClick={() => setView('list')}
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  className={`px-3 py-2 flex items-center justify-center transition-colors border-l border-outline-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${view === 'list' ? 'bg-accent-soft text-accent-hover' : 'bg-surface hover:bg-surface-container-low text-on-surface-variant'}`}
                >
                  <span className="material-symbols-outlined text-sm">view_list</span>
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <Loader />
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20">
              <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-accent text-2xl">search_off</span>
              </div>
              <h3 className="font-headline-md text-on-surface mb-2 tracking-widest uppercase text-lg">No Products Found</h3>
              <p className="font-body-md text-on-surface-variant mb-8 max-w-sm leading-relaxed">Try adjusting your search or filters to find what you're looking for.</p>
              <button onClick={clearFilters} className="btn btn-primary">Clear Filters</button>
            </div>
          ) : (
            <div
              ref={gridRef}
              className={`reveal ${gridInView ? 'in-view' : ''} ${view === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8" : "space-y-4"}`}
            >
              {results.map((item) => (
                <div key={item.id} className={`card group overflow-hidden ${view === 'list' ? 'flex flex-row items-center p-4 gap-6' : 'flex flex-col'}`}>
                  <div className={`product-media bg-surface-container-low flex-shrink-0 ${view === 'list' ? 'w-32 h-32 rounded-md' : 'aspect-square'}`}>
                    {getProductImage(item) ? (
                      <img src={getImageUrl(getProductImage(item))} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl">image</span>
                      </div>
                    )}
                  </div>

                  <div className={`flex flex-col flex-grow ${view === 'grid' ? 'p-5' : ''}`}>
                    <Link
                      to={`/product/${item.id}`}
                      className="font-label-lg hover:text-accent focus-visible:text-accent focus-visible:outline-none transition-colors mb-1"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-on-surface-variant mb-4">{item.category?.name}</p>

                    <div className={`mt-auto ${view === 'list' ? 'flex items-center justify-between gap-4' : ''}`}>
                      <div className={`flex items-center gap-2 ${view === 'grid' ? 'mb-4' : ''}`}>
                        <span className="font-headline-sm">{formatPrice(getProductPrice(item))}</span>
                      </div>

                      <Link
                        to={`/product/${item.id}`}
                        className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${view === 'list' ? 'btn-primary px-6 py-2 rounded' : 'w-full btn-outline flex items-center justify-center gap-2 py-2 rounded'}`}
                      >
                        {view === 'grid' && <span className="material-symbols-outlined text-sm">visibility</span>}
                        View Product
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  );
};
