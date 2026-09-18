# Phase 3B-3 Frontend Image Resolution Tests Report

## 1. Actual ProductImage Type
The current definition in `frontend/src/types/product.ts` is:
```typescript
export interface ProductImage {
  id: number;
  imageUrl: string;
  displayOrder: number;
  isPrimary: boolean;
  altText?: string;
  productType?: 'ATTAR' | 'PERFUME' | '';
  width?: number;
  height?: number;
  format?: string;
}
```
The variant type in `frontend/src/types/variant.ts` includes `productType: string` and `productImages?: ProductImage[]`.

## 2. Test Framework Used
**None.** I inspected `package.json` and the frontend source tree. There is no existing frontend testing framework (like Jest, Vitest, Mocha, etc.), nor is there a `test` script defined in `package.json`.

## 3. Tests Created
**None.** As per the strict instructions: *"Do NOT introduce a new testing framework merely for this task. If no frontend unit-testing framework exists, report that clearly and determine the smallest safe approach for testing the pure utility."* and *"If the project has no frontend test runner, STOP before inventing one and report the limitation."* I have stopped and refrained from inventing a testing framework or creating `productUtils.test.ts`.

## 4. Fallback Hierarchy
The required fallback hierarchy (captured in the audited logic and intended for the new utility) is:
1. **Type Primary**: `altText` matches requested type & `isPrimary === true`.
2. **Type First**: `altText` matches requested type (lowest `displayOrder` or first item).
3. **Shared Primary**: `altText` is empty/null & `isPrimary === true`.
4. **Shared First**: `altText` is empty/null (lowest `displayOrder` or first item).

## 5. Wishlist Bug Behavior Captured
The `Wishlist.tsx` file currently maps over `productIds`, fetching `VariantResponse` from `/variants/${id}`. It then calls `getVariantThumbnail(variant)`.
However, `getVariantThumbnail` strictly evaluates `variant.productImages` (which contains *all* images for the product) looking only for `isPrimary` or sorting by `displayOrder`. It completely ignores `variant.productType`. This results in the bug where, for example, a PERFUME variant is displayed with an ATTAR image if the ATTAR image is the primary image for the product.

## 6. Smallest Safe Approach for Testing the Pure Utility
Since `productUtils.ts` will be a pure TypeScript function with no React dependencies, the smallest safe approach without introducing heavy frameworks like Vitest/Jest is:
1. We can create a temporary node script (e.g. `test-runner.js`) that imports the compiled utility and runs assertions using Node's built-in `node:assert` module.
2. Alternatively, if we just want to verify type safety and build correctness, we can rely on `tsc --noEmit` and manual verification in the UI.

## 7. Validation Results
- Frontend typecheck (`npx tsc --noEmit`): **PASS**
- Frontend build (`npm run build`): **PASS**

## 8. Exact Changed Files
Only this report has been created.
- `svgphase_3b3_frontend_image_tests_report.md`
No application code (`productUtils.ts`, `Product.tsx`, `ProductCard.tsx`, `Wishlist.tsx`) has been modified, and no test framework was invented.
