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
      <div className="bg-surface p-8 rounded-xl border border-outline-variant shadow-[0_10px_30px_rgba(18,28,42,.04)] flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-accent" size={24} />
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4">
        <div>
          <h3 className="font-headline-lg text-2xl md:text-3xl text-ink tracking-wide mb-2">
            Similar Fragrances
          </h3>
          <p className="text-sm text-on-surface-variant font-body-md leading-relaxed">
            Customers also bought these fragrances.
          </p>
        </div>
        <a
          href="/collection"
          className="inline-flex items-center gap-1.5 text-[11px] font-label-md uppercase tracking-[0.2em] text-ink hover:text-accent transition-colors group mt-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          View All
          <span className="transform transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
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
