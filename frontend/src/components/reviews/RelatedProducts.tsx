import React, { useEffect, useState } from 'react';
import { productService } from '../../services/productService';
import { ProductCard } from '../product/ProductCard';
import type { Product } from '../../types';
import { Loader2 } from 'lucide-react';

interface RelatedProductsProps {
  productId: number;
}

export const RelatedProducts: React.FC<RelatedProductsProps> = ({ productId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        setLoading(true);
        const data = await productService.getRelatedProducts(productId);
        setProducts(data);
      } catch (error) {
        console.error('Failed to load related products', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRelated();
  }, [productId]);

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 font-headline-lg tracking-tight mb-1">
            Similar Fragrances
          </h3>
          <p className="text-sm text-gray-500 font-body-md">
            Customers also bought these fragrances.
          </p>
        </div>
        <a 
          href="/collection" 
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-700 transition-colors group mt-1"
        >
          View All 
          <span className="transform transition-transform group-hover:translate-x-1">→</span>
        </a>
      </div>
      
      {/* Mobile: horizontal carousel, Tablet/Desktop: fixed responsive grid */}
      <div className="flex sm:grid gap-6 overflow-x-auto sm:overflow-x-visible pb-4 sm:pb-0 snap-x hide-scrollbar w-full sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <div key={product.id} className="min-w-[240px] sm:min-w-0 flex-shrink-0 snap-start w-full">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
};
