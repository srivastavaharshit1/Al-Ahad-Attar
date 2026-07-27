import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { ProductCard } from '../components/product/ProductCard';
import { Pagination } from '../components/ui/Pagination';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types';
import { productService } from '../services/productService';
import type { Product } from '../types';

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

  useEffect(() => {
    categoryService.getActiveCategories().then(res => {
      setCategories(res.data || []);
      // If we have a URL category param, try to find the matching category ID
      if (activeCategory) {
        const normalizedActive = activeCategory.toLowerCase().replace(/\s+/g, '-');
        const match = (res.data || []).find(
          (c: Category) => c.name.toLowerCase().replace(/\s+/g, '-') === normalizedActive
        );
        if (match) setSelectedCategoryId(match.id);
      }
    }).catch(console.error);
  }, [activeCategory]);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategoryId, selectedSubcategory, selectedGender, selectedBrand, sortBy, searchQuery, currentPage]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sortField, sortDir] = sortBy.split(',');
      const params: Record<string, any> = {
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
      setProducts(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (catId: number | '') => {
    setSelectedCategoryId(catId);
  };

  const clearFilters = () => {
    setSelectedCategoryId('');
    setSelectedSubcategory('');
    setSelectedGender('');
    setSelectedBrand('');
    setSearchQuery('');
    setSortBy('createdAt,desc');
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
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-24">
      <header className="mb-12 md:mb-16">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: activeCategory ? activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1) : 'Collection' }
          ]}
        />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface">
              {pageTitle}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-4 max-w-2xl">
              Discover our curated selection of artisanal fragrances, masterfully blended following centuries-old traditions.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase">Sort By</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface font-body-md text-body-md rounded-DEFAULT focus:ring-primary focus:border-primary py-2 pl-4 pr-10"
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
              className={`px-8 py-2.5 rounded-full font-label-md transition-colors ${
                selectedSubcategory === ''
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              All Bakhoor
            </button>
            <button
              onClick={() => { setSelectedSubcategory('BAKHOOR'); setSearchParams(prev => { prev.delete('page'); return prev; }); }}
              className={`px-8 py-2.5 rounded-full font-label-md transition-colors ${
                selectedSubcategory === 'BAKHOOR'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Bakhoor
            </button>
            <button
              onClick={() => { setSelectedSubcategory('FRESHENERS'); setSearchParams(prev => { prev.delete('page'); return prev; }); }}
              className={`px-8 py-2.5 rounded-full font-label-md transition-colors ${
                selectedSubcategory === 'FRESHENERS'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-primary'
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
                  className="w-4 h-4 border-outline-variant text-primary focus:ring-primary cursor-pointer"
                />
                <span className="ml-3 font-body-md text-body-md text-on-surface-variant group-hover:text-primary transition-colors">All</span>
              </label>
              {categories.map(cat => (
                <label key={cat.id} className="flex items-center group cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategoryId === cat.id}
                    onChange={() => handleCategoryChange(cat.id)}
                    className="w-4 h-4 border-outline-variant text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="ml-3 font-body-md text-body-md text-on-surface-variant group-hover:text-primary transition-colors">{cat.name}</span>
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
                    onChange={() => setSelectedGender(g)}
                    className="w-4 h-4 border-outline-variant text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="ml-3 font-body-md text-body-md text-on-surface-variant group-hover:text-primary transition-colors">
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
              className="w-full text-center font-label-sm text-label-sm text-error border border-error rounded-DEFAULT py-2 hover:bg-error-container/20 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </aside>

        {/* Product Grid */}
        <div className="col-span-1 lg:col-span-9">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-error">
              <span className="material-symbols-outlined text-4xl mb-4 block">error</span>
              <p>{error}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-4 block">inventory_2</span>
              <p className="font-body-lg mb-4">No products found matching your filters.</p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-primary font-label-md hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="font-label-sm text-on-surface-variant mb-6">{totalElements} products found</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-12">
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
