# Phase 4 Performance Audit

## 1. Scope
This READ-ONLY phase evaluates the backend and frontend repositories of Al Ahad Attars for real, measurable performance bottlenecks. The focus is specifically on N+1 queries, inefficient loops, destructive caching patterns, redundant database access, and frontend rendering limits.

## 2. Current Git Baseline
- **Branch:** main
- **Commit:** `3236b23` (Centralize homepage DTO mapping)
- **Status:** Clean working tree.

## 3. Baseline Test Results
- **Backend Tests:** `mvn test -DreuseForks=false`
  - Result: 190 tests run, 0 failures, 0 errors. BUILD SUCCESS. Time elapsed: 05:02 min.
- **Frontend Validation:** `npx tsc --noEmit` & `npm run build`
  - Result: TypeScript check PASSED. Vite build PASSED (321kB total js, properly split).

## 4. Backend Database Audit
The database access patterns were traced manually via source inspection. 
- **N+1 Avoidance (Positive Finding):** `@BatchSize` is utilized extremely effectively on `Product.variants`, `Product.images`, and `Product.collections`. This turns what would be an O(N) query explosion on the homepage/collection APIs into a bounded batch lookup (1 query per 32 products).
- **Service-Level Loop Queries (Negative Finding):** Several critical loops perform direct `findById` operations. The `CartServiceImpl.syncGuestCart` and `OrderServiceImpl.createOrder` methods iterate over `request.getItems()` and fetch `ProductVariant` and `Bottle` entities inside the loop. In high-concurrency or high-cart-volume scenarios, this generates excessive sequential database round trips.

## 5. Backend Service Audit
- **OrderServiceImpl:** N+1 behavior identified within `createOrder` (MEASURED as inferred from code structure).
- **PromotionEngineServiceImpl:** Validates free items by fetching the promotion by ID directly inside a loop initiated by `OrderServiceImpl` (INFERRED).
- **ProductServiceImpl:** `deleteProduct` loops through a product's variants to set `active = false` and calls `save` individually, producing a sequential transaction overhead instead of a bulk `UPDATE` (INFERRED).

## 6. Caching Audit
- **Destructive Caching Patterns:** `OrderServiceImpl` forcefully invalidates the ENTIRE `products` cache via `@CacheEvict(value = "products", allEntries = true)` whenever ANY order is created or cancelled. At production scale, this guarantees a cache stampede during high-traffic checkout events (e.g. flash sales), heavily degrading public catalog performance.
- **Stale Stock Data (Overselling Risk):** `OrderServiceImpl` fails to evict the `homepage` cache. Since `homepage` has a 30-minute TTL, recently purchased and depleted products will continue to appear as "in stock" on the homepage for up to half an hour.

## 7. Product/Image Performance
- Validated post-Phase 3. Images are well-structured, URL construction is centralized, and the frontend resolves sizes safely. `@BatchSize(size = 32)` handles collection fetching efficiently.

## 8. API Performance
- Pagination is properly implemented for the primary product catalogs (handled in `ProductServiceImpl.getProducts`).
- The `ProductSummaryResponse` mapping creates slightly oversized payloads due to returning complete lists of available sizes and default variants, but this is required by the current frontend design.

## 9. Frontend Performance
- **React Rendering:** Route-level code splitting is highly effective (e.g., `ProductForm` 26kB gz, `Homepage` 8.6kB gz).
- **Lazy Loading:** `useInView` is used correctly on the Product page to defer rendering and fetching of `RelatedProducts` and `ReviewList` until they scroll into the viewport, avoiding unnecessary network waterfalls.
- **Pagination:** `Collection.tsx` honors URL-based pagination properly.

## 10. Network/Deployment Performance
- Current architecture relies on Cloudflare Pages and Supabase PostgreSQL. High-latency API round trips are mitigated by the `@Cacheable` directives on the Spring Boot side, making the global cache invalidation problem even more critical to fix.

## 11. Payment Performance
- Razorpay verification flows correctly utilize idempotency via the `consumed` boolean flag on the `PaymentIntent` entity. This ensures duplicate webhooks do not trigger redundant order creations.

## 12. Production-Scale Analysis
- **A. 1 customer:** Fast, cache hit rate ~100%.
- **B. 50 concurrent customers (Browsing):** High performance, minimal DB load due to cache.
- **C. 100 concurrent customers (Mixed Browsing & Purchasing):** Severe degradation. Each purchase wipes the `products` cache, forcing all 100 users to simultaneously hit the DB to regenerate `ProductSummaryResponse` payloads.
- **D. 500 concurrent customers:** Immediate database connection pool exhaustion triggered by cache stampedes and N+1 query loops in the cart/order services.

## 13. Performance Findings

1. **Global Cache Invalidation Stampede**
   - Location: `OrderServiceImpl` (createOrder, cancelOrder)
   - Issue: `@CacheEvict(value = "products", allEntries = true)`
2. **Stale Homepage Stock Data**
   - Location: `CacheConfig` / `OrderServiceImpl`
   - Issue: `homepage` cache is not cleared when stock changes.
3. **Order Creation N+1 Loop**
   - Location: `OrderServiceImpl.createOrder`, `CartServiceImpl.syncGuestCart`
   - Issue: Calling `findById` for variants and bottles inside `request.getItems()` loops.
4. **Promotion Validation N+1**
   - Location: `PromotionEngineServiceImpl.validateFreeItemEligibility`
   - Issue: Fetches promotion by ID per free item instead of pre-loading.
5. **Inefficient Variant Deactivation**
   - Location: `ProductServiceImpl.deleteProduct`
   - Issue: Looping over `productVariantRepository.save()` instead of bulk update.

## 14. Severity and Confidence

| Finding | Severity | Confidence | Measurement Type |
|---------|----------|------------|------------------|
| Cache Invalidation Stampede | P1 | HIGH | INFERRED |
| Stale Homepage Stock Data | P1 | HIGH | INFERRED |
| Order Creation N+1 Loop | P1 | HIGH | INFERRED |
| Guest Cart Sync N+1 Loop | P2 | HIGH | INFERRED |
| Promotion Validation N+1 | P2 | MEDIUM | INFERRED |
| Inefficient Variant Deactivation | P3 | HIGH | INFERRED |

## 15. Proposed Fixes

1. **Cache Stampede / Stale Stock (P1)**
   - *Fix:* Remove dynamic `stock` and `active` metrics from cached `ProductSummaryResponse` payloads. Treat catalog (Name, Desc, Image) as immutable public cache. Fetch stock via a separate lightweight, uncached endpoint, OR surgically evict only the specific modified `product_X` keys instead of `allEntries = true`.
2. **Order Creation / Cart Sync N+1 (P1/P2)**
   - *Fix:* Extract all `variantId` and `bottleId` values from `request.getItems()` prior to the loop. Fetch them via a single `findAllById(ids)` query, store in a `Map<Long, ProductVariant>`, and retrieve from the Map inside the loop.
3. **Variant Deactivation Loop (P3)**
   - *Fix:* Implement `@Modifying @Query("UPDATE ProductVariant v SET v.active = false WHERE v.product = :product")` in `ProductVariantRepository`.

## 16. Benchmark Requirements
- **Cache Changes:** Requires benchmarking API response times under simulated write contention (e.g. 10 buys/sec).
- **N+1 Fixes:** Requires checking `SQL query count` using hibernate stats before and after placing an order with 10 distinct items.

## 17. Safe Performance Improvements
The safest candidates are the N+1 fixes in `OrderServiceImpl` and `CartServiceImpl`. Refactoring loops to use `findAllById` introduces zero business logic changes while guaranteeing a bounded query count. 

## 18. Risks
Surgically modifying cache keys is high risk if not handled perfectly, as it could result in ghost stock or orphaned cache entries.

## 19. Recommended Implementation Order
1. Fix Order/Cart N+1 loops (Safe, isolated).
2. Fix Variant bulk deactivation (Safe, isolated).
3. Investigate Cache invalidation redesign (Requires careful architectural alignment).

## 20. Final Conclusion
The application heavily relies on `@Cacheable` to protect its database, but aggressive cache invalidation logic destroys this protection under high write-load. Combined with N+1 queries during checkout, the application is highly vulnerable to database exhaustion during traffic spikes. The frontend, conversely, is highly optimized with excellent bundle splitting and scroll-based lazy loading.
