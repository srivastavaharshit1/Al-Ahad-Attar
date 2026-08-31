# Bulk Pricing Testing and Implementation Plan

This plan outlines the verification strategy for the 11 bulk pricing test cases requested, along with architectural fixes to address identified gaps before testing begins.

## 1. Architectural Fixes (Pre-Test)

### Double Submission Protection (Idempotency)
Currently, if a malicious user or an accidental double-click sends the exact same bulk pricing `APPLY` request twice concurrently, the backend will process both sequentially due to row-level locks, causing the price adjustment to compound (e.g., a 10% increase becomes a ~21% increase).

**Proposed Solution:**
1. **Frontend**: Generate a unique `idempotencyKey` (using `crypto.randomUUID()`) when the Bulk Pricing component mounts or when the form resets after a successful application. Include this key in the `APPLY` payload.
2. **Backend (DTO)**: Add `String idempotencyKey` to `BulkPricingRequest`.
3. **Backend (Database)**: 
    - Create a new migration script to add `idempotency_key VARCHAR(100) UNIQUE` to the `bulk_price_audit` table.
    - Update the `BulkPriceAudit` entity to map this column.
4. **Backend (Service)**: In `BulkPricingServiceImpl.apply`, proactively check and insert a placeholder audit record (or rely on the unique constraint during the final audit insert) to guarantee that concurrent requests with the same key will fail fast or roll back, preventing double-execution.

## 2. Verification Plan (The 11 Tests)

To exhaustively test all edge cases, I will create a Spring Boot Integration Test suite (`BulkPricingIntegrationTest.java`) that simulates an authenticated admin and directly executes REST API calls against the endpoints.

*   **Test 1 & 2 (Universal Increase/Decrease):** The test will seed prices, execute the `/preview` endpoint, verify DB integrity, then execute `/apply` and verify the math (e.g., 100 * 1.1 = 110) and audit logs.
*   **Test 3 (Category Specific):** Seed products in different categories. Apply a change to one category and verify products in the other category remain completely untouched.
*   **Test 4 (Variant Specific):** Seed multiple variants (10ml, 20ml, 50ml). Apply a change to `10ml` only and assert the other sizes remain unchanged.
*   **Test 5 (Security & Field Manipulation):** 
    - Assert `401 Unauthorized` for unauthenticated requests.
    - Assert `403 Forbidden` for requests authenticated as a regular Customer.
    - Assert `200 OK` for Admin.
    - Send arbitrary JSON fields (`isAdmin: true`, `newPrice: 1`) in the payload and assert they are ignored (Jackson's default behavior).
*   **Test 6 (Invalid Input):** Send payloads with `0%`, `-10%`, `101%`, empty values, and invalid category IDs. Assert that `400 Bad Request` and `ConstraintViolationException` correctly block the execution.
*   **Test 7 (Preview Security):** Assert that calling `/preview` creates no audit records and does not change any `product_variant` prices.
*   **Test 8 (Double Submission):** Launch two concurrent threads submitting the exact same `/apply` request with the same `idempotencyKey`. Assert that only one succeeds, and the price is modified exactly once.
*   **Test 9 (Transaction Rollback):** Simulate a database failure (e.g., by intercepting the audit record creation to throw a `RuntimeException`) and verify that no partial price updates are committed to the database.
*   **Test 10 (Razorpay Price Integrity):** Add an updated product to the cart and invoke the checkout/order creation endpoint. Verify the order total is calculated from the backend database price, disregarding any manipulated prices sent from the client.
*   **Test 11 (Audit History):** Verify the `BulkPriceAudit` record contains all required fields, correct status, and no sensitive information.

## User Review Required

> [!IMPORTANT]  
> The addition of the **Idempotency Key** is a necessary architectural change to satisfy the "Double Submission" security requirement. This requires a minor database schema update to enforce uniqueness. 

If this plan is approved, I will immediately execute the schema update, modify the frontend/backend to support idempotency, and write the integration test suite to validate all 11 conditions, fixing any bugs discovered along the way.
