# Phase 3A: Backend/Frontend Refactoring Audit

## 1. ProductMapper Audit
**Target**: `ProductMapper.toSummaryResponse()`

### Current Logic
The method constructs a `ProductSummaryResponse` from a `Product` entity by applying complex variant and image resolution rules.
- **Conditional Branches**:
  - `requestedContextType` evaluation (fallback to category name "Perfumes" -> "PERFUME" or "Attars" -> "ATTAR").
  - Variant filtering: filters by active status, then filters again by `preferredType`.
  - Min price calculation: computes minimum price among preferred variants.
  - Default variant selection: finds the first preferred variant matching the minimum price.
  - Thumbnail resolution: heavily nested conditionals evaluating `preferredType`, `altText`, and `isPrimary`.

### Image-Selection Rules (Thumbnail)
- If `preferredType` is provided:
  1. Image with matching `altText` && `isPrimary == true`
  2. Image with matching `altText` (any)
  3. Image with empty/null `altText` (shared) && `isPrimary == true`
  4. Image with empty/null `altText` (shared)
- If `preferredType` is null:
  1. Any image with `isPrimary == true`
  2. Any active image.
- **Sorting**: Matches are resolved using `min(displayOrder -> id)`.
- **Null handling**: Safely falls back if lists are empty.
- **URL Resolution**: Uses `storageService.resolveUrl()`.

### Helper Extraction
Extracting private helpers like `resolvePreferredType()`, `resolvePreferredVariants()`, and `resolveThumbnailImage()` is entirely feasible and would precisely preserve existing behavior while reducing cyclomatic complexity.

---

## 2. Behavior Baseline
The refactoring must preserve the following behaviors exactly:
- **A. Attar-only product**: Resolves to ATTAR preferred type. Min price, stock, and variants reflect only ATTAR variants. Thumbnail resolves to ATTAR primary.
- **B. Perfume-only product**: Resolves to PERFUME preferred type. 
- **C. Product containing both (Mixed)**: Aggregates variants and images based entirely on the passed `requestedContextType`.
- **D. Product with shared images**: Shared images (no `altText`) are used as fallbacks if type-specific images are unavailable.
- **E. Product with type-specific primary images**: Type-specific primary images are given highest precedence for their respective type.
- **F. Product without a primary image**: Resolves to the first available image sorted by `displayOrder`, then `id`.
- **G. Product with multiple images and displayOrder**: Honors `displayOrder` sorting (lowest first).
- **H. Product with missing/null image metadata**: Treated as shared fallback images.
- **I. Product with no images**: Resolves thumbnail to `null` safely.
- **J. Product with multiple variants**: Filters inactive variants, computes global stock, and accurately maps the minimum price to the default variant.

---

## 3. Duplication Audit

### Backend
1. **Primary Image Resolution**: 
   - Found in `PromotionEngineServiceImpl.java` (lines 587-595) and `OrderServiceImpl.java` (lines 874-882). Both use an identical `.filter(img -> img.isActive() && img.isPrimary()).findFirst().orElseGet(...)` chain.
   - *Classification*: Genuine duplication / Safe refactoring candidate.
2. **URL Resolution**: 
   - `storageService.resolveUrl()` is used identically across mappers and services.
   - *Classification*: Intentional duplication (required by architecture).

### Frontend
1. **Primary Image Selection**: 
   - Found duplicated across `Wishlist.tsx`, `ProductCard.tsx`, and `Product.tsx`. All three re-implement the fallback chains (e.g. type-specific primary -> shared primary -> first image).
   - *Classification*: Genuine duplication / Safe refactoring candidate.

---

## 4. Other Refactoring Candidates
- `ProductMapper.toSummaryResponse()` is 134 lines long. It should be broken down into composable, private helper methods.
- The `Comparator` in `toSummaryResponse()` is instantiated on every method call. It should be a `private static final` field.
- Frontend image resolution should be extracted to a centralized utility function (e.g., `getPrimaryThumbnail(product, type)` in `utils/productUtils.ts`).

---

## 5. API Contract Safety
- **ProductMapper Refactoring**: Extracting private helpers does **NOT** alter the API contract. REST responses, DTO structures, JSON field names, null behaviors, and image URLs will remain exactly the same.
- **Backend Services**: Extracting a primary image helper on the entity/service level does not affect the contract.
- **Frontend Refactoring**: Creating a utility function does not change component props or network requests.

*All proposed changes are strictly structural refactorings.*

---

## 6. Test Coverage
- **Current State**: There is **no dedicated `ProductMapperTest.java`**. The mapper's complex logic is currently only implicitly tested via service integration tests (e.g., `ProductServiceImplTest`).
- **Missing Coverage**: The specific behavior baseline rules (A-J) are not locked down by explicit assertions against the mapper itself.
- **Requirement**: A comprehensive `ProductMapperTest` covering all permutations of variants, image `altText`, `isPrimary`, and `displayOrder` MUST be implemented **BEFORE** any refactoring of `ProductMapper`.

---

## 7. Performance Check
- The `imageComparator` inside `ProductMapper.toSummaryResponse()` is needlessly recreated on every invocation.
- Stream traversal inside the `orElseGet` fallback chains is slightly inefficient but currently bounded by small collection sizes.
- No severe performance bottlenecks identified, just minor optimizations available through refactoring.

---

## 8. Refactoring Plan

### Priority 1: Establish Test Harness
- **File**: `backend/src/test/java/com/alahadattars/mapper/ProductMapperTest.java`
- **Current Problem**: Missing explicit unit tests for complex image/variant resolution.
- **Proposed Change**: Implement unit tests covering baseline behaviors A-J.
- **Why behavior remains unchanged**: Adds tests without modifying production code.
- **Risk Level**: None.

### Priority 2: Refactor ProductMapper
- **File**: `backend/src/main/java/com/alahadattars/mapper/ProductMapper.java`
- **Current Problem**: `toSummaryResponse` is monolithic and mixes variant/image logic.
- **Proposed Change**: Extract private helpers (`resolvePreferredType`, `resolvePreferredVariants`, `resolveThumbnailImage`) and declare the `Comparator` as static.
- **Why behavior remains unchanged**: Pure structural extraction of identical logic.
- **Risk Level**: Low (conditional on Priority 1 completion).

### Priority 3: Extract Frontend Utility
- **File**: `frontend/src/components/product/ProductCard.tsx`, `Wishlist.tsx`, `Product.tsx`
- **Current Problem**: Duplicated image resolution logic on the frontend.
- **Proposed Change**: Create a central utility function `utils/productUtils.ts` to handle thumbnail selection.
- **Why behavior remains unchanged**: Replaces inline logic with identical centralized logic.
- **Risk Level**: Low.

### Priority 4: Refactor Duplicate Service Logic
- **File**: `OrderServiceImpl.java`, `PromotionEngineServiceImpl.java`
- **Current Problem**: Duplicated fallback logic for `primary` image.
- **Proposed Change**: Move logic to a shared helper or `Product` entity method (e.g., `getPrimaryImageFallback()`).
- **Why behavior remains unchanged**: Centralizes exact existing logic.
- **Risk Level**: Low.
