import type { Category } from './category';
import type { SubCategory } from '../services/subCategoryService';
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
  subCategory?: SubCategory;
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
  subCategory?: SubCategory;
  minimumPrice: number;
  thumbnail: string;
  totalStock: number;
  defaultVariantId: number;
  defaultVariantSize: string;
  availableSizes: string[];
  averageRating: number;
  reviewCount: number;
  active: boolean;
}
