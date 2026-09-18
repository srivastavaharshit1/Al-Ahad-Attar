import type { ProductImage } from './product';

export interface Variant {
  id: number;
  productType: string;
  size: string;
  price: number;
  stock: number;
  sku: string;
  active: boolean;
  productId?: number;
  productName?: string;
  productImages?: ProductImage[];
}
