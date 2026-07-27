import { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import type { Product } from '../types';

export const useProducts = (params?: Record<string, any>) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await productService.getProducts(params);
        if (isMounted) {
          setProducts((response as any).content || (response as any).data?.content || []);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProducts();
    
    return () => { isMounted = false; };
  }, [JSON.stringify(params)]);

  return { products, isLoading, error };
};

export const useProduct = (id: string) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    let isMounted = true;
    
    const fetchProduct = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await productService.getProduct(id);
        if (isMounted && response.data) {
          setProduct(response.data);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to fetch product');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProduct();
    
    return () => { isMounted = false; };
  }, [id]);

  return { product, isLoading, error };
};
