import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import type { Product, Category } from '../../types';
import { formatPrice } from '../../utils/formatPrice';
import { getImageUrl } from '../../utils/getImageUrl';
import { Pagination } from '../../components/ui/Pagination';
import { Loader } from '../../components/ui/Loader';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { downloadCSV } from '../../utils/exportUtils';
import toast from 'react-hot-toast';


export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '0', 10);

  useEffect(() => {
    categoryService.getActiveCategories().then(res => setCategories(res.data || [])).catch(console.error);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, categoryId]);

  const fetchProducts = async (pageOverride?: number) => {
    try {
      setIsLoading(true);
      const params: any = { page: pageOverride ?? currentPage, size: 10 };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (categoryId) {
        params.categoryId = categoryId;
      }
      const response = await productService.getProducts(params);
      setProducts(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (error) {
      console.error("Failed to load products", error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryId(e.target.value);
    searchParams.set('page', '0');
    setSearchParams(searchParams);
  };

  const handlePageChange = (page: number) => {
    searchParams.set('page', page.toString());
    setSearchParams(searchParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchParams.set('page', '0');
    setSearchParams(searchParams);
    fetchProducts(0);
  };

  const handleExportCSV = async () => {
    try {
      const toastId = toast.loading('Exporting products...');
      const params: any = { page: 0, size: 10000 };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (categoryId) {
        params.categoryId = categoryId;
      }
      const response = await productService.getProducts(params);

      const exportData = (response.content || []).map((p: any) => ({
        'ID': p.id,
        'Name': p.name,
        'Slug': p.slug,
        'Category': p.category?.name || '',
        'Brand': p.brand,
        'Price': getProductPrice(p),
        'Total Stock': getProductStock(p),
        'Active': p.active ? 'Yes' : 'No',
        'Featured': p.featured ? 'Yes' : 'No',
        'Gender': p.gender
      }));
      
      downloadCSV(exportData, 'Products');
      toast.success('Products exported successfully', { id: toastId });
    } catch (error) {
      console.error('Export failed', error);
      toast.error('Failed to export products');
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      await productService.deleteProduct(deleteConfirmId);
      toast.success('Product deleted successfully');
      setDeleteConfirmId(null);
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product', error);
      toast.error('Failed to delete product. It may be part of an order.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getProductImage = (product: any) => {
    return product.thumbnail || product.variants?.[0]?.image || '';
  };
  
  const getProductPrice = (product: any) => {
    return product.minimumPrice || product.variants?.[0]?.price || 0;
  };
  
  const getProductStock = (product: any) => {
    if (product.totalStock !== undefined) return product.totalStock;
    if (!product.variants || product.variants.length === 0) return 0;
    return product.variants.reduce((acc: number, v: any) => acc + v.stock, 0);
  };

  return (
    <>
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Products Masterlist</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Manage your luxury fragrance catalog and stock inventory.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleExportCSV} type="button" className="btn btn-outline px-6 py-3 rounded-lg">
            <span className="material-symbols-outlined text-[20px]">download</span>
            Export CSV
          </button>
          <Link to="/admin/products/new" className="btn btn-primary px-6 py-3 rounded-lg">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add Product
          </Link>
        </div>
      </div>

      <div className="table-shell">
        <div className="p-6 border-b border-outline-variant flex flex-wrap gap-4 items-center justify-between bg-surface-bright">
          <div className="flex gap-4">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search products..."
                className="field-input py-2.5 pl-4 pr-10 text-sm min-w-[200px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-on-surface-variant hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors">
                <span className="material-symbols-outlined text-[18px]">search</span>
              </button>
            </form>
            <div className="relative">
              <select
                value={categoryId}
                onChange={handleCategoryChange}
                className="field-input appearance-none py-2.5 pl-4 pr-10 font-label-sm text-label-sm uppercase tracking-wide cursor-pointer min-w-[160px]"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">expand_more</span>
            </div>
          </div>
          <div className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
            Showing {products.length} of {totalElements} items
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <Loader />
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">No products found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Gender</th>
                  <th>Price</th>
                  <th>Stock Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const stock = getProductStock(product);
                  return (
                    <tr key={product.id} className="group">
                      <td data-label="Product">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-surface-variant rounded-md overflow-hidden border border-outline-variant flex-shrink-0 flex items-center justify-center">
                            {getProductImage(product) ? (
                              <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={getImageUrl(getProductImage(product))} alt={product.name} />
                            ) : (
                              <span className="material-symbols-outlined text-outline text-[24px]">image</span>
                            )}
                          </div>
                          <div>
                            <div className="font-headline-md text-headline-md text-on-surface text-[18px] leading-tight mb-1">{product.name}</div>
                            <div className="font-label-sm text-label-sm text-on-surface-variant">ID: {product.id}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Category">
                        {product.categoryName || 'Uncategorized'}
                        {product.subcategory && <span className="text-on-surface-variant text-sm ml-1">({product.subcategory})</span>}
                      </td>
                      <td data-label="Gender">
                        <span className="badge badge-neutral">{product.gender || 'UNISEX'}</span>
                      </td>
                      <td className="font-medium" data-label="Price">{formatPrice(product.minimumPrice || 0)}</td>
                      <td data-label="Stock Status">
                        {stock > 10 ? (
                          <span className="badge badge-success">
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            In Stock ({stock})
                          </span>
                        ) : stock > 0 ? (
                          <span className="badge badge-warning">
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            Low Stock ({stock})
                          </span>
                        ) : (
                          <span className="badge badge-error">
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            Out of Stock
                          </span>
                        )}
                      </td>
                      <td className="text-right" data-label="Actions">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                          <Link to={`/admin/products/${product.id}/edit`} className="p-2 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors" title="Edit">
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </Link>
                          <button onClick={() => handleDelete(product.id.toString())} className="p-2 rounded-md text-on-surface-variant hover:text-error hover:bg-surface-container-low focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors" title="Delete">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="p-6 border-t border-outline-variant flex justify-center bg-surface-bright">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
      
      <ConfirmationDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => !isDeleting && setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Delete Product"
        description="Are you sure you want to delete this product? It will disappear from the storefront."
        entityName={products.find(p => p.id.toString() === deleteConfirmId)?.name}
        warningMessage="Historical orders will remain."
        confirmText="Delete Product"
        isLoading={isDeleting}
        actionType="DELETE"
      />

      <div className="h-section-gap"></div>
    </>
  );
};
