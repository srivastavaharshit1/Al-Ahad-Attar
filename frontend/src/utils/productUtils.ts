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
