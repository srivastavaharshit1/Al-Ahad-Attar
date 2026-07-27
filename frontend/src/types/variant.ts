export interface Variant {
  id: number;
  productType: string;
  size: string;
  price: number;
  stock: number;
  sku: string;
  image: string;
  active: boolean;
  productId?: number;
  productName?: string;
}
