# Phase 4C Cache Invalidation & Stampede Characterization Report

## 1. Executive Summary
A strict read-only audit was performed on the caching layer. Two critical P1 concerns from the Phase 4 performance audit were verified:
1. **Global Cache Stampede Risk:** Every order creation or cancellation globally wipes the entire `products` cache via `@CacheEvict(allEntries = true)`. Because Spring Cache's `@Cacheable` defaults to `sync = false`, concurrent post-eviction requests are uncoordinated and will independently hit the database, creating a stampede risk.
2. **Stale Homepage Stock Data:** `OrderServiceImpl` and `ProductVariantController` evict the `products` cache upon stock mutations, but they fail to evict the `homepage` cache. The homepage cache (TTL = 30 min) embeds `ProductSummaryResponse` objects which contain a `totalStock` field, meaning the homepage will display stale stock data for up to 30 minutes after an order is placed.

## 2. Product Cache Inventory
All product caching is defined at the controller level (`ProductController`):
- `getProductById`: `@Cacheable(value = "products", key = "'product_' + #id")`
- `getProductBySlug`: `@Cacheable(value = "products", key = "'slug_' + #slug")`
- `getFeaturedProducts`: `@Cacheable(value = "products", key = "'featured'")`
- `getProductsByCategory`: `@Cacheable(value = "products", key = "'category_' + #categoryId")`
- `getRelatedProducts`: `@Cacheable(value = "products", key = "'related_' + #id")`

*(Note: The main paginated search endpoint `getProducts` is purposefully not cached).*

## 3. Product Cache Key Analysis
A single product can simultaneously exist in up to 5 different cache entries (`product_{id}`, `slug_{slug}`, `featured`, `category_{id}`, `related_{id}`). Because of this multi-dimensional caching, modifying the stock of a single product invalidates multiple keys. Without a reverse-lookup mechanism mapping an ID to its slug and categories, targeted eviction (by key) is extremely complex.

## 4. Every Global Eviction Location
Global eviction (`allEntries = true`) is used exclusively. The locations are:
- **`OrderServiceImpl`**: `createOrder`, `cancelOrder`, `adminCancelOrder` (Evicts: `"products"`)
- **`ProductVariantController`**: `cleanupSizes`, `createVariant`, `deleteVariant`, `updateVariantStock` (Evicts: `"products"`)
- **`ProductController` / `ProductImageController` / `CategoryController` / `AdminBulkPricingController`**: Admin mutation endpoints (Evicts: `"products"`, `"homepage"`)
- **`AdminHomepageController`**: Admin CMS endpoints (Evicts: `"homepage"`)

## 5. Order Creation/Cancellation Interaction
When an order is created or cancelled, stock levels are decremented or restored. `OrderServiceImpl` triggers a global `@CacheEvict(value = "products", allEntries = true)`.
- **Entire cache affected?** Yes.
- **Product data changed?** Yes, `totalStock` changes.
- **Is invalidation required?** Yes, because cached product responses expose stock availability.
- **Is narrower eviction possible?** Yes, but only with a cache key redesign or a manual `CacheManager` inspection loop. Given the current key structure, targeted eviction is not safely possible via simple annotations.

## 6. Stampede/Concurrency Analysis
- **Trigger:** `@CacheEvict(allEntries = true)` completely empties the Caffeine cache.
- **Coordination:** None. Spring cache annotations omit `sync = true`.
- **Stampede mechanism:** `request → Caffeine miss (no lock) → Controller method executes → Database query`.
Because there is no synchronization, 100 concurrent users hitting `/slug/perfume-x` immediately after an order is placed will result in 100 identical database queries.

## 7. Homepage Cache Inventory
- **Location:** `PublicHomepageController.getHomepageData()`
- **Cache Name:** `"homepage"`
- **Key:** Default (Empty key, caches the single JSON response).
- **TTL:** 30 minutes (`CacheConfig.java`).
- **Population:** Aggregates 6 concurrent queries (Hero, Promo, Categories, Featured Products, Testimonials, WhyChooseUs).
- **Stock staleness:** The `featuredProducts` section embeds `ProductSummaryResponse`, which includes `totalStock`.

## 8. Homepage Stock Staleness Analysis
Because the homepage aggregates `getFeaturedProducts()` output into its payload, its cache becomes a secondary store for product stock. However, the homepage cache is decoupled from the product cache.

## 9. Complete Stock Mutation → Cache Invalidation Matrix
| Operation | Class | Evicts `"products"`? | Evicts `"homepage"`? | Staleness Risk |
| :--- | :--- | :--- | :--- | :--- |
| Create Order | `OrderServiceImpl` | YES (Global) | **NO** | Homepage stale for up to 30 min |
| Cancel Order | `OrderServiceImpl` | YES (Global) | **NO** | Homepage stale for up to 30 min |
| Admin Cancel Order| `OrderServiceImpl` | YES (Global) | **NO** | Homepage stale for up to 30 min |
| Update Variant Stock| `ProductVariantController` | YES (Global) | **NO** | Homepage stale for up to 30 min |
| Create/Delete Variant| `ProductVariantController` | YES (Global) | **NO** | Homepage stale for up to 30 min |

## 10. Existing Cache / Test Coverage
- **Unit/Integration Tests:** There are exactly **0** tests validating cache hits, cache misses, or cache eviction behavior.
- Cache behavior is entirely unprotected by the test suite.

## 11. Observability / Benchmark Availability
- The project lacks `spring-boot-starter-actuator` and `micrometer-registry`.
- The Caffeine cache instance in `CacheConfig.java` does not have `.recordStats()` enabled.
- **Safest local benchmark approach:** 
  1. Temporarily add `.recordStats()` to `Caffeine.newBuilder()` in `CacheConfig`.
  2. Set `logging.level.org.springframework.cache=TRACE` in `application.properties` to monitor hits/misses.
  3. Set `spring.jpa.show-sql=true` to count database queries during a simulated stampede.

## 12. Finding Classification
1. **Stale Homepage Cache:** Class **C** (Benchmark/concurrency evidence required). 
   *Reasoning:* While it is a bug, simply adding `"homepage"` to `OrderServiceImpl`'s eviction list would mean the homepage cache is globally wiped on *every single order placement*. This would destroy the homepage cache hit rate for busy stores. 
2. **Product Cache Stampede:** Class **D** (Current global invalidation is required due to key structure) and Class **B** (Requires tests).
   *Reasoning:* We cannot safely transition to targeted eviction without massive refactoring of cache keys.

## 13. Smallest Safe Implementation Candidates
For review only (no automatic implementation):
- **For Stale Homepage:** Remove `totalStock` from the `HomepageDataResponse` payload. The homepage only needs to know if a product is "Out of Stock" (boolean), not the exact integer. Alternatively, drastically lower the homepage TTL to `5` minutes, accepting a minor staleness window to preserve cache hit rates.
- **For Stampede:** Add `sync = true` to the `@Cacheable` annotations in `ProductController` and `PublicHomepageController`. This tells Spring to synchronize cache misses, coalescing concurrent requests into a single database query.

## 14. Risks
- Adding `sync = true` can cause thread contention if the underlying database query is extremely slow.
- Wiping the homepage cache on every order (if attempted) will cascade the stampede issue to the homepage.

## 15. Recommended Next Implementation Phase
1. Introduce basic cache unit tests to verify `sync = true` behavior.
2. Implement `sync = true` on all `@Cacheable` product and homepage endpoints.
3. Align with business stakeholders on homepage stock staleness: either accept the 30-minute staleness, lower the TTL, or remove strict inventory integers from the homepage payload.
