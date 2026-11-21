import type { ProductImage } from '../types';

/**
 * Resolves the most appropriate product image URL based on type and primary flags.
 * Fallback Hierarchy: Type Primary -> Type First -> Shared Primary -> Shared First.
 *
 * @param images The array of product images (pre-sorted by displayOrder).
 * @param type Optional product type to filter by (e.g., 'ATTAR' or 'PERFUME').
 * @returns The resolved image URL, or undefined if no suitable image is found.
 */
export function resolveProductImage(
  images: ProductImage[] | null | undefined,
  type?: string | null
): string | undefined {
  if (!images || images.length === 0) {
    return undefined;
  }

  let candidateImages = images;

  if (type) {
    const typeUpper = type.toUpperCase();
    const typedImages = images.filter(img => img.altText && img.altText.toUpperCase() === typeUpper);

    if (typedImages.length > 0) {
      candidateImages = typedImages;
    } else {
      const sharedImages = images.filter(img => !img.altText || img.altText.trim() === '');
      if (sharedImages.length > 0) {
        candidateImages = sharedImages;
      } else {
        candidateImages = [];
      }
    }
  }

  if (candidateImages.length === 0) {
    return undefined;
  }

  const primary = candidateImages.find(img => img.isPrimary);
  if (primary) {
    return primary.imageUrl;
  }

  return candidateImages[0].imageUrl;
}

/**
 * Extracts a numeric volume/size value for sorting (e.g., "3ml" -> 3, "6ml" -> 6, "12ml" -> 12, "40g" -> 40).
 */
export function parseSizeNumeric(size?: string | null): number | null {
  if (!size) return null;
  const match = size.match(/(\d+(?:\.\d+)?)\s*(?:ml|g|gm|grams|pc|pcs|pack)?/i);
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? null : val;
  }
  return null;
}

/**
 * Sorts variants logically:
 * 1. By parsed numeric volume/weight ascending (e.g., 3ml -> 6ml -> 12ml).
 * 2. If sizes cannot be parsed or are identical, fall back to price ascending.
 */
export function sortVariantsByVolume<T extends { size?: string | null; price?: number }>(variants: T[]): T[] {
  return [...variants].sort((a, b) => {
    const valA = parseSizeNumeric(a.size);
    const valB = parseSizeNumeric(b.size);

    if (valA !== null && valB !== null && valA !== valB) {
      return valA - valB;
    }
    if (valA !== null && valB === null) return -1;
    if (valA === null && valB !== null) return 1;

    return (a.price || 0) - (b.price || 0);
  });
}
