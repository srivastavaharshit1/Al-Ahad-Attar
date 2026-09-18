# Phase 2M — Commit Repair Report

## Issues Resolved
1. **Unrelated Files**: The previous bad commit `ea6927bccee445ec81b00cf4f79fb1ddc91c055f` included Phase 2K frontend changes. These have been isolated and committed separately into a preceding Phase 2K commit (`99e77b1`).
2. **Missing Test**: A new test `PromotionConfigurationTest.java` was added to verify JSON backward compatibility when deserializing legacy payloads with `buyProductId`.

## Git History Reconstruction
- **Old Bad Commit**: `ea6927bccee445ec81b00cf4f79fb1ddc91c055f`
- **Phase 2F/Pre-Phase 2K Baseline**: `6793f47` (Harden legacy promotion migration classification)
- **New Phase 2K Commit**: `99e77b1` (Phase 2K: Final frontend product variant image references removed)
- **New Corrected Phase 2M Commit**: `d91469b` (Remove legacy buyProductId architecture)

## Phase 2M Changed Files (Commit: `d91469b`)
```
backend/src/main/java/com/alahadattars/entity/PromotionConfiguration.java
backend/src/main/java/com/alahadattars/enums/PromotionScope.java
backend/src/main/java/com/alahadattars/service/impl/PromotionConfigValidator.java
backend/src/main/java/com/alahadattars/service/impl/PromotionEngineServiceImpl.java
backend/src/main/java/com/alahadattars/service/impl/PromotionResponseMapper.java
backend/src/main/java/com/alahadattars/service/migration/BuyProductIdMigrationService.java
backend/src/test/java/com/alahadattars/entity/PromotionConfigurationTest.java
backend/src/test/java/com/alahadattars/service/impl/PromotionConfigValidatorTest.java
backend/src/test/java/com/alahadattars/service/impl/PromotionEngineServiceTest.java
backend/src/test/java/com/alahadattars/service/migration/BuyProductIdMigrationServiceTest.java
frontend/src/pages/admin/Promotions.tsx
frontend/src/types/promotion.ts
```

## Excluded Files (Committed to Phase 2K instead)
```
frontend/src/components/layout/SearchOverlay.tsx
frontend/src/pages/Search.tsx
frontend/src/pages/admin/Products.tsx
frontend/src/types/variant.ts
```

## JSON Backward-Compatibility Test Details
- File: `backend/src/test/java/com/alahadattars/entity/PromotionConfigurationTest.java`
- The test supplies a raw JSON block containing `"buyProductId": 123`. 
- Validates the `ObjectMapper` successfully deserializes it without throwing exceptions.
- Verifies `buyScope` and `buyVariantIds` are accurately populated from the remaining valid properties.
- Re-serializes the object to ensure `"buyProductId"` is completely omitted in the output, proving that saving a legacy promotion through the modern app safely scrubs the legacy field.

## Build and Test Verification
- **Backend**: `mvn clean test -DreuseForks=false` → **SUCCESS (165/165 passing)** (1 extra test from the new compatibility test).
- **Frontend TypeScript**: `npx tsc --noEmit` → **SUCCESS**
- **Frontend Build**: `npm run build` → **SUCCESS**

## Global Repository Reference Search
- Search query: `buyProductId`
- Only one remaining file matched: `backend/src/test/java/com/alahadattars/entity/PromotionConfigurationTest.java` (the compatibility test itself).
- **Executable application code contains zero legacy references.**
- `BuyProductIdMigrationService` and its test were permanently deleted.

## Verification of Promotion Behavior
- Inspected the `PromotionEngineServiceImpl` changes to verify modern `FREE_PRODUCT` scopes (`CATEGORY`, `SPECIFIC_PRODUCT`, `ANY_PRODUCT`) execute safely using the respective collections (`buyVariantIds`, `buyCategoryId`, `buyVariantSizes`, `freeProductIds`).
- Verified `CART_DISCOUNT` and other promotions are untouched.

## Production Safety Assurances
- **Zero** production DB writes, deletes, or schema changes were performed. 
- The production backup table `promotion_phase_2h_backup_20260918` was left intact.

The Phase 2M commit is repaired and structurally sound.
