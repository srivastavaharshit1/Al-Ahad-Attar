export interface GiftSetImage {
  id: number;
  imageUrl: string;
  displayOrder: number;
  isPrimary: boolean;
  altText?: string;
}

export interface GiftSetItem {
  id: number;
  productId: number;
  productName: string;
  productSlug: string;
  variantId: number;
  variantSize: string;
  sku: string;
  variantOriginalPrice: number;
  quantity: number;
  displayOrder?: number;
  currentVariantStock: number;
  productImage?: string;
}

export interface GiftSet {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  salePrice?: number | null;
  active: boolean;
  featured: boolean;
  packagingNotes?: string;
  displayOrder?: number;
  inStock: boolean;
  availableStock: number;
  primaryImageUrl?: string;
  images: GiftSetImage[];
  items: GiftSetItem[];
  createdAt: string;
  updatedAt: string;
}

export interface GiftSetItemRequest {
  variantId: number;
  quantity: number;
  displayOrder?: number;
}

export interface GiftSetRequest {
  name: string;
  slug?: string;
  description?: string;
  price: number;
  salePrice?: number | null;
  packagingNotes?: string;
  active?: boolean;
  featured?: boolean;
  displayOrder?: number;
  items: GiftSetItemRequest[];
}

