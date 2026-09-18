# Phase 3B-3 Frontend Image Resolution Deduplication Audit

## 1. Exact Duplicated Logic Found

We audited the product-image resolution logic in three frontend files:
1. `frontend/src/pages/Product.tsx`
2. `frontend/src/pages/customer/Wishlist.tsx`
3. `frontend/src/components/product/ProductCard.tsx`

### Product.tsx
Uses a helper `getImagesForType(images, type)` to filter for type-specific images, falling back to shared images (where `altText` is empty/null). The caller then extracts the primary image or defaults to the first item:
```typescript
const typeImages = getImagesForType(imgs, initialType);
const primary = typeImages.find(img => img.isPrimary) ?? typeImages[0];
```

### ProductCard.tsx
Inlines identical logic when a `defaultType` is provided (used for thumbnails when no top-level thumbnail is returned):
```typescript
if (defaultType) {
  const typeImages = product.images.filter(img => img.altText?.toUpperCase() === defaultType.toUpperCase());
  const typePrimary = typeImages.find(img => img.isPrimary);
  const sharedImages = product.images.filter(img => !img.altText || img.altText.trim() === '');
  const sharedPrimary = sharedImages.find(img => img.isPrimary);
  selectedImage = typePrimary?.imageUrl || typeImages[0]?.imageUrl || sharedPrimary?.imageUrl || sharedImages[0]?.imageUrl;
}
```
If no `defaultType` is provided, it falls back to:
```typescript
selectedImage = product.images.find(img => img.isPrimary)?.imageUrl || product.images[0]?.imageUrl;
```

### Wishlist.tsx
Uses a `getVariantThumbnail` helper that picks an image from `variant.productImages` (which we verified from the DTO is just a dump of all product images):
```typescript
const primary = images.find((img: any) => img.isPrimary);
if (primary) return primary.imageUrl;
const sorted = [...images].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
return sorted[0].imageUrl;
```

## 2. Behavioral Differences & Classification

Classification: **C. Similar but behaviorally different (Wishlist contains a bug)**

- **Product.tsx & ProductCard.tsx**: Logically identical. Both implement a fallback hierarchy: `Type Primary -> Type First -> Shared Primary -> Shared First`. Both assume the array order satisfies `displayOrder` (which is correct, as the backend `@OrderBy("displayOrder ASC")` guarantees this).
- **Wishlist.tsx**: This implementation ignores the variant type (`item.variant.productType`) and simply grabs the first `isPrimary` image from the entire product images list. If a product has a primary image for ATTAR and a primary image for PERFUME, Wishlist simply takes whichever comes first, ignoring whether the user added the ATTAR or the PERFUME variant. This is a functional bug, likely introduced when `variant.image` was removed in Phase 2, and the frontend fell back to product-level images without checking types.

Therefore, extraction and deduplication are highly recommended because doing so will fix the `Wishlist.tsx` bug without altering the correct behavior of the other two files.

## 3. Recommended Utility API

We recommend extracting a single pure function into `frontend/src/utils/productUtils.ts`:

```typescript
import type { ProductImage } from '../types';

/**
 * Resolves the most appropriate product image URL based on type and primary flags.
 * Fallback Hierarchy: Type Primary -> Type First -> Shared Primary -> Shared First.
 *
 * @param images The array of product images (pre-sorted by displayOrder).
 * @param type Optional product type to filter by (e.g., 'ATTAR' or 'PERFUME').
 * @returns The resolved image URL, or undefined.
 */
export function resolveProductImage(
  images: ProductImage[] | undefined | null,
  type?: string | null
): string | undefined {
  if (!images || images.length === 0) return undefined;

  let candidateImages = images;

  if (type) {
    const typeUpper = type.toUpperCase();
    const typedImages = images.filter(img => img.altText?.toUpperCase() === typeUpper);

    if (typedImages.length > 0) {
      candidateImages = typedImages;
    } else {
      const sharedImages = images.filter(img => !img.altText || img.altText.trim() === '');
      if (sharedImages.length > 0) {
        candidateImages = sharedImages;
      }
    }
  }

  const primary = candidateImages.find(img => img.isPrimary);
  return primary?.imageUrl || candidateImages[0]?.imageUrl;
}
```

## 4. Proposed Files to Modify

1. `frontend/src/utils/productUtils.ts` (New/Modify) - Add the `resolveProductImage` utility.
2. `frontend/src/pages/Product.tsx` - Replace `getImagesForType` with the utility.
3. `frontend/src/pages/customer/Wishlist.tsx` - Replace `getVariantThumbnail` with `resolveProductImage(item.variant.productImages, item.variant.productType)`.
4. `frontend/src/components/product/ProductCard.tsx` - Replace inline conditional logic with `resolveProductImage(product.images, defaultType)`.

## 5. Test Requirements & Regression Risks

**Regression Risks:**
- **Zero visual change** is expected on Product and ProductCard components.
- **Wishlist visual change**: Wishlist thumbnails will correctly align with the variant type instead of defaulting to the first primary image. This is a deliberate bug fix.

**Test Requirements:**
- The frontend doesn't appear to have comprehensive Jest/Vitest unit tests for component rendering. We will write characterization tests for `resolveProductImage` directly inside a new `frontend/src/utils/productUtils.test.ts` to guarantee the fallback hierarchy behaves identically to the audited implementation.

## 6. Validation Results

Baseline frontend typecheck (`tsc --noEmit`) and build (`npm run build`) completed successfully with no errors, confirming the current state is clean.
