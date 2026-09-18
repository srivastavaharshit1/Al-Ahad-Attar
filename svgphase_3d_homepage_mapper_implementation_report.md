# Phase 3D-2 HomepageMapper Implementation Report

## 1. Objective
The objective of Phase 3D-2 was to centralize the duplicated Homepage DTO mapping implementations between the Admin (`HomepageServiceImpl`) and Public (`PublicHomepageServiceImpl`) services into a single reusable component (`HomepageMapper`), while strictly preserving the distinct behavioral semantics (like Admin URL cache-busting) of both domains.

## 2. Files Changed
- `backend/src/main/java/com/alahadattars/mapper/HomepageMapper.java` (New File)
- `backend/src/main/java/com/alahadattars/service/impl/HomepageServiceImpl.java` (Modified)
- `backend/src/main/java/com/alahadattars/service/impl/PublicHomepageServiceImpl.java` (Modified)
- `backend/src/test/java/com/alahadattars/mapper/HomepageMapperTest.java` (Modified)
- `backend/src/main/java/com/alahadattars/service/ProductImageResolver.java` (Modified - **ONLY UTF-8 BOM removal**, no logic changed)
- `svgphase_3d_backend_refactoring_audit.md` (Created during Phase 3D Discovery)
- `svgphase_3d_homepage_mapper_characterization_report.md` (Created during Phase 3D-1 Characterization)

## 3. HomepageMapper Design
`HomepageMapper` was introduced as a `@Component` responsible strictly for DTO construction. It accepts a `boolean bustCache` parameter in its mapping methods to dynamically select the correct URL resolution strategy, allowing a single unified method to serve both the Admin (cache-busting required) and Public (cache-busting prohibited) contexts without over-engineering.

## 4. Mapping Methods Centralized
The following exactly duplicated manual `.builder()` methods were extracted and centralized:
- `mapHero` (for `HeroBannerResponse`)
- `mapPromo` (for `PromoBannerResponse`)
- `mapTestimonial` (for `TestimonialResponse`)
- `mapWhyChoose` (for `WhyChooseUsItemResponse`)
- `mapSection` (for `HomepageSectionResponse`)

## 5. Admin/Public URL Semantics
- **Admin**: The mapper resolves the URL and appends `?v=<timestamp>` or `&v=<timestamp>` based on the entity's `updatedAt` (or `System.currentTimeMillis()` as fallback). This cache-busting behavior is triggered by passing `bustCache = true`.
- **Public**: The mapper returns the standard resolved URL from `storageService.resolveUrl()` without any query parameters by passing `bustCache = false`.

## 6. Newsletter Behavior
The inline conditional mapping logic for `NewsletterConfigResponse` (e.g., falling back to the string `"Subscribe"` if the description is null or empty) was intentionally left in `PublicHomepageServiceImpl`, as it is not duplicated across services.

## 7. HomepageServiceImpl Refactor
`HomepageServiceImpl` was injected with `HomepageMapper`. The five private mapping methods were refactored to delegate to `HomepageMapper` with `bustCache = true`. The service remains fully responsible for repository orchestration, sorting, and lifecycle management. Method visibilities were preserved.

## 8. PublicHomepageServiceImpl Refactor
`PublicHomepageServiceImpl` was injected with `HomepageMapper`. The five private mapping methods were refactored to delegate to `HomepageMapper` with `bustCache = false`. Parallel database fetching, ordering, and the specific Newsletter logic remain strictly within the service. Method visibilities were preserved.

## 9. Tests
`HomepageMapperTest` was successfully upgraded to test `HomepageMapper` directly while preserving all characterization assertions via Mockito mocking on the services. Coverage includes:
- Individual DTO mappings (`mapSection`, `mapWhyChooseUsItem`)
- A strict regression test proving that given the same image input, the Admin mapper appends `?v=` while the Public mapper does not.
- Timestamp fallbacks (fallback to current time millis when `updatedAt` is null).
- Existing query string handling (safely appending `&v=` instead of `?v=`).
- Empty collection handling.
- Newsletter fallback conditionals.
- Graceful null image URL handling.
- Validating the ordering behaviors of the public service.

## 10. Duplication Removed
The five identical private builder methods containing nearly ~140 lines of duplicate field assignments have been successfully eliminated from both `HomepageServiceImpl` and `PublicHomepageServiceImpl`. `HomepageMapper` serves as the single source of truth for constructing homepage-related response DTOs.

## 11. BOM Correction
- **BOM Confirmed**: The `illegal character: '\ufeff'` defect introduced during Phase 3C was confirmed via a Node.js read buffer as `EF BB BF`.
- **BOM Removed**: The 3 bytes were stripped and the file was saved cleanly as UTF-8.
- **Integrity**: `ProductImageResolver.java` Java logic remains 100% untouched. `pom.xml` and dependencies remain untouched. No compiler workaround was used for the final validation step.

## 12. Business Logic Safety
This refactoring was strictly limited to DTO construction and URL presentation string formatting. Absolutely zero changes were made to repository query semantics, database schema, pricing, promotions, product logic, order flow, payments, authentication, or authorization API contracts.

## 13. Backend Test Result
*(Authoritative final output from `mvn clean test -DreuseForks=false` after the BOM removal)*
- **Tests run**: 190
- **Failures**: 0
- **Errors**: 0
- **Skipped**: 0
- **Build result**: BUILD SUCCESS (03:20 min)

## 14. Frontend TypeScript Result
- **Execution**: `npx tsc --noEmit`
- **Result**: PASS

## 15. Frontend Production Build Result
- **Execution**: `npm run build`
- **Result**: PASS (built in 4.01s)

## 16. git diff --check
- **Execution**: `git diff --check`
- **Result**: PASS (Clean; no trailing whitespace or conflict markers detected).

## 17. Final Git Status
```text
 M backend/src/main/java/com/alahadattars/service/ProductImageResolver.java
 M backend/src/main/java/com/alahadattars/service/impl/HomepageServiceImpl.java
 M backend/src/main/java/com/alahadattars/service/impl/PublicHomepageServiceImpl.java
?? backend/src/main/java/com/alahadattars/mapper/HomepageMapper.java
?? backend/src/test/java/com/alahadattars/mapper/HomepageMapperTest.java
?? svgphase_3d_backend_refactoring_audit.md
?? svgphase_3d_homepage_mapper_characterization_report.md
?? svgphase_3d_homepage_mapper_implementation_report.md
```

## 18. Remaining Intentional Differences
- `HomepageServiceImpl` (Admin) retains its `resolveAndBust` logic *through* the mapper parameter (`bustCache = true`), which forces immediately visible changes for administrators.
- `PublicHomepageServiceImpl` retains its custom logic for conditionally mapping `HomepageSection` into `NewsletterConfigResponse`, as this behavior is completely unique to the public-facing storefront.
