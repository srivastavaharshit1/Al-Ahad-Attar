# Phase 4D Cache Benchmark & Implementation Plan

## 1. Executive Summary
This report defines the implementation and benchmark strategy for resolving two critical Phase 4 caching issues: the **product cache stampede risk** and **homepage stock staleness**. By leveraging Spring Cache's native synchronization and correctly propagating stock-mutation invalidations, we can eliminate database thundering herds and guarantee stock accuracy without introducing complex distributed locks or external caching frameworks like Redis.

## 2. Current Cache Architecture
- **Framework:** Spring Cache backed by Caffeine (`CaffeineCacheManager`).
- **Configuration:** Defined in `CacheConfig.java`.
- **Caches:** `"products"` (TTL: 5m), `"categories"` (TTL: 60m), `"homepage"` (TTL: 30m).
- **Concurrency:** The default Spring `@Cacheable` behavior is used (sync = false), meaning cache misses are not synchronized.
- **Eviction:** Global cache wipes (`@CacheEvict(allEntries = true)`) are used exclusively; there is no targeted per-key eviction.

## 3. Product Cache Invalidation Matrix
| Trigger Operation | Class / Component | Data Changed | Global Eviction Required? | Possible Targeted Strategy |
| :--- | :--- | :--- | :--- | :--- |
| Product Creation/Update | `ProductController` | Product details, category links | **YES** | Complex: Requires evicting by ID, Slug, Category, and Featured keys. |
| Product Deletion | `ProductController` | Removes product entirely | **YES** | Complex: Same as above. |
| Variant Update/Stock Update | `ProductVariantController` | Stock counts, price, SKU | **YES** | Complex: Variant mutations alter the parent `ProductSummaryResponse`. |
| Order Creation/Cancellation | `OrderServiceImpl` | Stock counts | **YES** | Complex: Product stock decreases/increases across all lists. |

**Conclusion:** Global invalidation is required. A single product mutation affects arbitrary paginated lists, category filters, and featured lists. Targeted eviction is practically impossible without tracking every arbitrary filter combination or adopting a complex cache-graph architecture. 

## 4. Product Cache Key Analysis
A single product can simultaneously populate multiple independent cache keys:
1. `product_{id}`
2. `slug_{slug}`
3. `featured`
4. `category_{categoryId}`
5. `related_{id}`

Modifying one product (e.g., deducting stock) renders *all* of these keys stale. Because there is no reverse mapping to know exactly which `category_{categoryId}` or `related_{id}` lists contain the mutated product, a global flush (`allEntries = true`) is the only safe Spring-native mechanism to guarantee consistency.

## 5. Stampede Mitigation Options
When a global eviction occurs, high traffic can cause a stampede where multiple concurrent threads independently experience a cache miss for the same key, executing the expensive DB query simultaneously.

* **Option A: Add `sync = true` to `@Cacheable` (Recommended)**
  Spring Cache supports `@Cacheable(..., sync = true)`. This relies on Caffeine's native `Cache.get(key, Function)` to lock the specific cache key. The first thread executes the database query while concurrent threads requesting the same key block and wait for the result.
* **Option B: Explicit per-key locking**
  Implementing a custom `ConcurrentHashMap` of `ReentrantLocks`. Unnecessary and error-prone since Spring/Caffeine provide this natively.
* **Option C: Redesign cache loading (Async Refresh)**
  Using Caffeine's `refreshAfterWrite`. Too complex for the current architecture and breaks Spring's annotation-driven model.

**Safest Option:** Option A. It is a one-word configuration change natively supported by the existing architecture.

## 6. Homepage Stock-Sensitive Data Analysis
- **Stock-sensitive data:** The homepage embeds `ProductSummaryResponse` via the `featured_products` section. This DTO includes `totalStock` and `active` status.
- **A. Does stock mutation make cached homepage data incorrect?** Yes, `totalStock` becomes stale immediately after an order.
- **B. Is the affected data actually displayed?** It dictates "Out of Stock" badges and "Add to Cart" validation on the frontend.
- **C/D. Does every stock mutation require invalidation?** Strictly, yes, to guarantee visual consistency. 
- **E/F. Alternatives:** Removing `totalStock` from the payload or significantly lowering the TTL.

## 7. Homepage TTL/Staleness Analysis
- **Configured TTL:** 30 minutes (`CacheConfig.java`).
- **Maximum theoretical staleness:** 30 minutes.
- **Normal expected staleness:** Up to 30 minutes after any customer places an order, because `OrderServiceImpl` currently does *not* evict `"homepage"`.
- **Reset events:** Admin CMS updates or Admin product updates (which evict `"homepage"`).

## 8. Benchmark Methodology
A temporary, local-only benchmark will be used to prove the efficacy of `sync = true`.

**Setup:**
1. Enable `spring.jpa.show-sql=true`.
2. Enable `logging.level.org.springframework.cache=TRACE`.

**Execution (The Stampede Test):**
1. Clear the cache (trigger an eviction via dummy order or admin endpoint).
2. Fire concurrent requests at a single endpoint (e.g., `/api/products/slug/perfume-x`) using a tool like Apache Benchmark (`ab -n 50 -c 50`).

**Measurements:**
- **Baseline (sync = false):** Observe 50 distinct database queries in the logs. Measure p95 latency.
- **Candidate (sync = true):** Observe exactly 1 database query. The other 49 requests should return instantly upon the first thread's completion. Measure p95 latency.

## 9. Characterization Test Plan
Before deploying the fix, we must add regression tests protecting cache behavior.

**Product Cache Tests:**
1. **Cache Hit/Miss:** Verify a second call to `getProductBySlug` does not hit the DB.
2. **Stampede Prevention:** Use an `ExecutorService` to fire concurrent calls and verify the repository is called exactly `times(1)`.
3. **Mutation Invalidation:** Verify `OrderServiceImpl.createOrder` forces a subsequent `getProductBySlug` to hit the DB.

**Homepage Cache Tests:**
1. **Cache Hit/Miss:** Verify consecutive calls do not hit the DB.
2. **Staleness Fix:** Verify that `OrderServiceImpl.createOrder` successfully evicts the `"homepage"` cache, forcing a DB hit on the next read.

## 10. 4E-1 Implementation Plan (Stampede Mitigation)
- **Target Files:** `ProductController.java`, `PublicHomepageController.java`
- **Change:** Update all `@Cacheable` annotations.
  - From: `@Cacheable(value = "products", key = "...")`
  - To: `@Cacheable(value = "products", key = "...", sync = true)`
  - From: `@Cacheable("homepage")`
  - To: `@Cacheable(value = "homepage", sync = true)`
- **Tests Required:** Concurrent access cache tests.
- **Rollback Strategy:** Remove `sync = true`.

## 11. 4E-2 Implementation Plan (Homepage Correctness)
- **Target Files:** `OrderServiceImpl.java`, `ProductVariantController.java`
- **Change:** Add `"homepage"` to the eviction lists that currently only wipe `"products"`.
  - From: `@CacheEvict(value = "products", allEntries = true)`
  - To: `@CacheEvict(value = {"products", "homepage"}, allEntries = true)`
- **Tests Required:** Order creation to homepage eviction integration test.
- **Rollback Strategy:** Revert the eviction annotation to `"products"` only.

## 12. Risks and Rollback
- **Risk (4E-1):** `sync = true` can cause thread contention if the database locks up or the query takes extremely long, as waiting threads will block. Caffeine handles this gracefully, but standard connection pool timeouts apply.
- **Risk (4E-2):** Evicting the homepage on every order will significantly lower the homepage cache hit rate for high-volume stores. If performance degrades unacceptably, the fallback is to revert 4E-2 and instead lower the homepage TTL to 3-5 minutes.
- **Rollback:** Fully reversible via simple annotation string changes; no database migrations or architectural shifts are required.

## 13. Expected Impact
- **Database Load:** Eradication of CPU spikes during high-concurrency cache misses.
- **Data Consistency:** The homepage will reflect 100% accurate, real-time inventory counts, eliminating UI/cart mismatches for highly contested stock.

## 14. Exact Files Expected to Change
**Production Code:**
1. `backend/src/main/java/com/alahadattars/controller/ProductController.java`
2. `backend/src/main/java/com/alahadattars/controller/PublicHomepageController.java`
3. `backend/src/main/java/com/alahadattars/service/impl/OrderServiceImpl.java`
4. `backend/src/main/java/com/alahadattars/controller/ProductVariantController.java`

**Test Code:**
1. `backend/src/test/java/com/alahadattars/controller/ProductControllerCacheTest.java` (New)
2. `backend/src/test/java/com/alahadattars/controller/PublicHomepageControllerCacheTest.java` (New)

## 15. Recommended Implementation Order
1. Implement Characterization Tests (prove current failures/behavior).
2. Implement 4E-1 (Stampede mitigation with `sync = true`).
3. Execute the Stampede Benchmark locally.
4. Implement 4E-2 (Homepage cache invalidation correctness).
5. Run full regression suite and commit.
