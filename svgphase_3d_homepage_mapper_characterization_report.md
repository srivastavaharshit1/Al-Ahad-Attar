# Phase 3D-1: Homepage Mapper Characterization Report

## 1. Existing Homepage DTO Mapping Methods
The read-only inspection confirmed identical private mapping methods exist in both `HomepageServiceImpl` and `PublicHomepageServiceImpl`:
- `mapHero(HeroBanner)`
- `mapPromo(PromoBanner)`
- `mapTestimonial(Testimonial)`
- `mapWhyChoose(WhyChooseUsItem)`
- `mapSection(HomepageSection)`
Additionally, `PublicHomepageServiceImpl.getHomepageData()` contains inline conditional mapping for `NewsletterConfigResponse`.

## 2. Exact Duplicated Fields/Logic
Both services manually construct the exact same DTOs using `.builder()`.
- **HeroBanner**: `id`, `title`, `subtitle`, `description`, `buttonText`, `buttonUrl`, `badge`, `imageUrl`, `mobileImageUrl`, `active`, `displayOrder`.
- **PromoBanner**: `id`, `title`, `subtitle`, `imageUrl`, `buttonText`, `buttonUrl`, `backgroundColor`, `priority`, `startDate`, `endDate`, `active`.
- **Testimonial**: `id`, `customerName`, `photoUrl`, `rating`, `review`, `displayOrder`, `active`.
- **WhyChooseUsItem**: `id`, `icon`, `title`, `description`, `displayOrder`, `active`.
- **HomepageSection**: `id`, `sectionKey`, `title`, `subtitle`, `description`, `visible`, `displayOrder`, `maxItems`, `imageUrl`.

## 3. Admin vs Public URL Behavior
The only divergence in the mapping logic is URL resolution:
- **PublicHomepageServiceImpl**: Uses standard `storageService.resolveUrl(imageUrl, fallbackPath)`.
- **HomepageServiceImpl (Admin)**: Uses a private helper `resolveAndBust(imageUrl, fallbackPath, updatedAt)`.

## 4. Cache-Busting Behavior
The Admin `resolveAndBust` method explicitly constructs a cache-busting suffix.
- It uses `updatedAt.toEpochSecond()` (or `System.currentTimeMillis()` if null).
- It safely appends `?v=<timestamp>` or `&v=<timestamp>` depending on whether the raw resolved URL already contains a query string.
- This forces the Admin UI to bypass browser/CDN caches immediately upon image changes, whereas the Public UI relies on standard HTTP caching.

## 5. Null/Empty Behavior
- **Null Image URLs**: Handled gracefully. If `resolveUrl` returns null, `resolveAndBust` returns null without throwing a NullPointerException.
- **Empty Collections**: `PublicHomepageServiceImpl` successfully maps empty collections (e.g., if no heroes exist, it returns an empty list).
- **Newsletter Conditional Mapping**: If `nl.getDescription()` is null or empty, it safely falls back to `"Subscribe"`. If populated, it maps to `buttonText`.

## 6. Ordering Behavior
Both services rely on standard `@OrderBy` or query-level sorting (e.g., `findByVisibleTrueOrderByDisplayOrderAsc`). The Java Streams mapping logic natively preserves this insertion order from the database/repository.

## 7. Tests Created
A dedicated characterization test was created at:
`backend/src/test/java/com/alahadattars/mapper/HomepageMapperTest.java`
It explicitly tests the `PublicHomepageServiceImpl` and `HomepageServiceImpl` classes in isolation (via Mockito) to verify the behavior without modifying production code.

## 8. Test Coverage
The tests cover 12 edge cases, specifically validating:
1. `testAdminUrlCacheBusting`: Confirms the `?v=` suffix is generated correctly.
2. `testPublicUrlNoCacheBusting`: Confirms no suffix is appended.
3. `testNewsletterConditionalMapping`: Validates the `null` and empty string fallbacks for `buttonText`.
4. `testEmptyCollectionHandling`: Verifies empty repository responses map to empty JSON lists.
5. `testNullUrlHandlingAdmin`: Verifies null image URLs do not cause exceptions during cache-busting.
6. `testOrderingBehaviorPublic`: Confirms mapping preserves the ordered lists returned by repositories.

## 9. Maven/BOM Findings
**Issue Investigated**: The `illegal character: '\ufeff'` error reported in Phase 3D.
- **Cause**: In Phase 3C, a PowerShell file manipulation command (`Set-Content -Encoding UTF8`) was used to remove trailing whitespaces. Windows PowerShell 5.1 natively prepends a UTF-8 Byte Order Mark (BOM) when writing UTF-8. This BOM was subsequently committed in `79a1e6c`.
- **Failure Reason**: The standard Java compiler (`javac`) defaults to rejecting UTF-8 files containing a BOM.
- **Workaround**: A Node.js snippet (`fs.readFileSync` and `s.slice(3)`) was executed locally during this phase to cleanly strip the BOM bytes from `ProductImageResolver.java`, enabling `mvn test` to compile.
- **Impact**: `pom.xml` and dependencies remain strictly untouched. The workaround only repaired the local file bytes to match standard encoding.

## 10. Backend Test Result
- Execution: `mvn test -DreuseForks=false`
- Result: **PASS** (182 tests run, 0 failures) — *including the new characterization test*.

## 11. Frontend TypeScript Result
- Execution: `npx tsc --noEmit`
- Result: **PASS**

## 12. Frontend Build Result
- Execution: `npm run build`
- Result: **PASS**

## 13. Git Diff Check
- `git diff --check`: **PASS** (No trailing whitespace errors).

## 14. Final Git Status
```text
?? backend/src/test/java/com/alahadattars/mapper/HomepageMapperTest.java
?? svgphase_3d_homepage_mapper_characterization_report.md
```
*(Note: To strictly preserve the baseline tree, the BOM workaround was reverted locally via `git restore` after testing, leaving the production files identical to `79a1e6c`)*.

## 15. Behavior That MUST Remain Unchanged
When `HomepageMapper` is implemented, it **must**:
1. Preserve the conditional cache-busting parameter for Admin services.
2. Preserve the exact string values for the Newsletter conditional mapping (e.g., `"Subscribe"`, `"Thanks for subscribing!"`).
3. Maintain list ordering exactly as provided by the repository.
4. Safely map null URLs without throwing NPEs in the cache-busting utility.
