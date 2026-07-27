import type { Category } from './category';
import type { Variant } from './variant';

export interface ProductImage {
  id: number;
  imageUrl: string;
  displayOrder: number;
  isPrimary: boolean;
  altText?: string;
  width?: number;
  height?: number;
  format?: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string;
  description: string;
  brand: string;
  subcategory?: string;
  fragranceFamily: string;
  topNotes: string;
  middleNotes: string;
  baseNotes: string;
  longevity: string;
  projection: string;
  gender: string;
  featured: boolean;
  featuredInCollection: boolean;
  active: boolean;
  category: Category;
  categoryName?: string;
  minimumPrice?: number;
  averageRating: number;
  reviewCount: number;
  variants: Variant[];
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductSummary {
  id: number;
  name: string;
  slug: string;
  brand: string;
  featured: boolean;
  featuredInCollection: boolean;
  gender: string;
  categoryName: string;
  subcategory?: string;
  minimumPrice: number;
  thumbnail: string;
  totalStock: number;
  defaultVariantId: number;
  defaultVariantSize: string;
  availableSizes: string[];
  averageRating: number;
  reviewCount: number;
}
