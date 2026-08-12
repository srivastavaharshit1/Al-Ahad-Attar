# Al Ahad Attars — Production Readiness Audit

**Date:** 2026-07-29
**Scope:** Full-stack audit (Spring Boot backend + React frontend) triggered by a request to harden the app for real-client production deployment. This report covers what was found, what was fixed, what was deliberately deferred, and an honest assessment of what's still needed before go-live.

**Method:** Four parallel, read-only subsystem audits (backend security, database/JPA, frontend UX/accessibility, payments/email/notifications) — each required to cite file:line evidence, not speculate. Findings were triaged into Critical/High/Medium/Low, all Critical and High items were fixed automatically, and Medium/Low items were presented to the client for explicit sign-off before touching them. Every fix was compiled/type-checked and run against the existing test suite (94 backend tests, frontend `tsc -b && vite build`) to confirm zero regressions before being marked done.

---

## 1. What Was Fixed

### Critical (money / data-integrity risk)

| # | Issue | Fix |
|---|---|---|
| C1 | **Stock overselling race condition** — checkout decremented `ProductVariant.stock` via read-modify-write with no locking; two concurrent buyers on the last units could both succeed, overselling inventory. | Replaced with an atomic conditional `UPDATE ... WHERE stock >= :qty` (mirrors the existing `claimCancellation`/`claimRedemption` pattern already in the codebase). Applied to both the checkout decrement and inventory-restore paths. |
| C2 | **Razorpay refund double-charge risk** — the SDK has no idempotency-key support; a lost response after Razorpay processed a refund, followed by an admin retry, would send a second genuine refund request. | Added a pre-check against Razorpay's own refund records for the payment before calling refund again; if a matching non-failed refund already exists there, it's treated as already-completed instead of re-submitted. |

### High

| # | Issue | Fix |
|---|---|---|
| H1 | No rate limiting on login/register/forgot-password/reset-password — brute force / credential stuffing exposure. | In-memory fixed-window rate limiter (per-IP, per-endpoint). *Follow-up fix, same day:* the first version trusted `X-Forwarded-For` unconditionally, which let an attacker spoof a different IP on every request and bypass the limiter entirely — caught by automated review. Fixed to only trust that header from an explicit `TRUSTED_PROXIES` allowlist (empty/untrusted by default), parsed right-to-left per-hop rather than taking the client-controlled leftmost value. |
| H2 | File uploads (product/review images) accepted any file type by extension alone; SVG was served inline with `image/svg+xml` — a real stored-XSS vector. | Whitelisted image types + magic-byte content verification (rejects a script renamed `photo.png`); SVG rejected outright; removed the `.svg` → `image/svg+xml` content-type mapping from every file-serving controller as defense-in-depth. |
| H3 | CORS hardcoded to `http://localhost:5173` — would block the real production frontend, or invite an insecure fix (wildcard + credentials) under deploy pressure. | Environment-driven, comma-separated `CORS_ALLOWED_ORIGINS`, defaulting to the existing dev origin so nothing broke. |
| H4/H5 | N+1 queries on order-list (~81 queries/page) and product-listing (~41 queries/page) endpoints. | `@BatchSize` on the relevant lazy associations (Hibernate's recommended fix for paginated to-many collections — `JOIN FETCH` would have broken pagination). |
| H6 | Admin Dashboard showed **hardcoded fake** "+12.5% / +8.2% / +4.1% vs last month" next to real KPIs — actively misleading business decisions. | Revenue trend is now computed for real from the existing monthly-revenue series; Orders/Customers trends (no historical breakdown available without a backend change) had the fabricated numbers removed rather than replaced with a different fake number. |
| H7 | Checkout's "Pay Securely" button re-enabled while the Razorpay modal was still open, allowing a second click to create a duplicate payment-order mid-payment. | `isSubmitting` now stays true until the modal actually resolves (`ondismiss`, success, or `payment.failed`), not immediately after `rzp.open()` returns. |
| H8 | No Razorpay webhook — if a customer's browser closed after payment capture but before the checkout redirect completed, the order was permanently stuck unpaid with zero visibility. | Added `POST /api/payment/webhook` with real signature verification (separate `RAZORPAY_WEBHOOK_SECRET`, fails closed if unset) and a reconciliation check that loudly logs "stuck checkout" cases for manual follow-up. *(Full auto-order-creation from the webhook alone isn't possible — `PaymentIntent` only stores amount/user, not the cart/address/coupon the client would submit; documented as a known limitation, not silently left broken.)* |

Plus, from the investigation immediately preceding this audit: the **DB connection-leak fix** (a `@Transactional` method was holding a pooled JDBC connection open for the full duration of a blocking Razorpay HTTP call — the actual root cause of the Supabase "too many clients" outage) and **HikariCP hardening** (explicit pool sizing + leak-detection-threshold, previously running on defaults with leak detection disabled).

### Medium/Low (approved batch)

Exception messages no longer leaked to clients (M2) · production logging profile added to stop logging SQL bind values/PII at DEBUG-TRACE (M3) · missing indexes added on Review/ReviewImage/ReviewReport foreign keys (M4) · notification sending made `@Async` to match the email service pattern (M5) · confirmation dialog added before address deletion (M7) · Dashboard no longer flashes zeroed KPIs while loading (M8) · two pieces of dead/unreachable code removed — an unused notification method and an unguarded `updatePaymentStatus` endpoint that bypassed all Razorpay verification (M13/M14) · risky `cascade=ALL` on Category→Product removed, relying on the existing service-level delete guard instead (L2) · modal dialogs (`Modal`, `AddressModal`, `ConfirmationDialog`) now have proper `role="dialog"`/`aria-modal` and a keyboard focus trap (L3/L4) · a dead, client-suppliable `amount` field removed from the payment-order DTO (L7).

**L6** (explicit Razorpay SDK HTTP timeout) was investigated but not implemented — the vendored SDK version (1.4.6) exposes no timeout configuration surface; forcing one would mean replacing its HTTP layer, judged disproportionate for a Low-severity item. Documented here rather than silently dropped.

---

## 2. Verification

- **Backend:** 94 JUnit tests (37 new this session), `mvn test` — 89 passing, the same 5 pre-existing failures present before this audit began (an H2 test-database reserved-keyword gap unrelated to any of this work, already documented in `PROJECT_REPORT.md`). Zero new regressions introduced by any fix.
- **Frontend:** `tsc -b && vite build` — clean compile, successful production bundle, both before and after every batch of changes.
- **Not verified live:** the backend could not be booted against the real Supabase database during the investigation that preceded this audit (a connection-pool exhaustion issue, since resolved by the fix that started this whole thread) — none of the fixes in this report have been exercised against a running instance with real traffic. Everything above is verified by compilation, unit tests, and static review, not by hitting the running API or clicking through the UI.

---

## 3. Explicitly Deferred (client's call, not done)

These were presented with rationale and the client chose not to action them now:

- **M1** — JWT not revoked on password reset (a stolen token survives a reset until natural expiry). Requires a token-version claim touching every request's auth check.
- **M6** — `ddl-auto: update` with no Flyway/Liquibase. Real, but adopting a migration tool is a deliberate project decision, not a drop-in fix.
- **M9** — No postal/pincode format validation on the address form.
- **M10** — JWT expiry mid-checkout silently hard-redirects to login with no explanation and loses in-progress state.
- **M11** — `validators.ts` (email/password/phone validators) exists but is wired into nothing; left as-is rather than either connecting it (a form-behavior change) or deleting it.
- **M12** — WhatsApp notifications are fully simulated (logged, not sent) — not a bug, just something the client should know isn't live before launch.

## 4. Not Yet Audited

**SEO (Phase 13 of the original ask) was not covered by this audit pass, and a dedicated SEO pass was explicitly declined by the client when offered.** Quick verification done regardless: no `robots.txt`, no `sitemap.xml`, no meta description, no OpenGraph/Twitter card tags, no canonical URLs, no structured data, no web manifest. The favicon exists. This is a real, known gap, left as-is by client decision rather than oversight.

The other documentation deliverables originally requested (`README.md` updates, `DEPLOYMENT.md`, `API_DOCUMENTATION.md`, `DATABASE.md`, `ENVIRONMENT_VARIABLES.md`, `SECURITY_REPORT.md`, `PERFORMANCE_REPORT.md`, `TESTING_REPORT.md`, `CHANGELOG.md`) were not generated in this pass — producing all nine as genuine, useful documents (not boilerplate) is a substantial task in its own right, better done deliberately than rushed alongside a code-fixing pass. This report covers the audit-report deliverable specifically; say the word and I'll work through the rest.

---

## 5. Scores

These reflect what was actually verified in this pass, not aspiration. "Before → After" where the audit changed the picture.

| Category | Before | After | Basis |
|---|---|---|---|
| **Security** | 5/10 | 8/10 | Critical/High items fixed (rate limiting, upload validation, CORS, webhook auth) and verified by tests. Remaining gap: JWT non-revocation (M1, deferred), no live pen-test performed. |
| **Performance** | 5/10 | 7/10 | N+1 fixes are structurally correct (Hibernate's documented pattern) but not confirmed via a live SQL query count — no running DB to verify against during this pass. |
| **Data Integrity** | 4/10 | 8/10 | The stock-overselling race and refund-double-charge risk were the two most serious findings in the whole audit; both fixed and unit-tested. |
| **Accessibility** | 5/10 | 6/10 | Modal focus-trap/ARIA fixed. No screen-reader testing, no contrast audit, no full keyboard-nav pass across the whole app — this pass touched dialogs specifically, not the full surface. |
| **UI/UX** | 6/10 | 7/10 | Fabricated Dashboard metrics removed, double-submit and delete-confirmation gaps closed. Broader UX audit (forms, empty/error states) found mostly clean already. |
| **SEO** | — | — | Not audited — declined by client, see §4. Real gaps found on a 5-minute spot check (no robots.txt/sitemap/meta), left unaddressed by decision, not oversight. |
| **Code Quality** | 6/10 | 7/10 | Dead code removed (2 methods), a genuine connection-leak architectural bug fixed with proper separation of concerns, test coverage added for every new code path (37 new tests). |
| **Testing** | 5/10 | 6/10 | Backend has real unit-test discipline (94 tests) but zero integration tests actually pass (pre-existing H2 config gap) and zero frontend tests exist at all — no Vitest/Jest configured. |
| **Deployment Readiness** | 4/10 | 6/10 | `.env.example` fully documented including new secrets (webhook, CORS, prod profile). Still missing: migration tooling (M6), a real prod smoke test, live payment/webhook verification (Razorpay keys are still placeholders per pre-existing project state). |

**Overall production readiness: ~65%.**

This is meaningfully better than where the app started, and the two Critical findings (overselling, double-refund) plus the connection-leak root cause were genuinely dangerous for a real paying client — those alone justify this pass. But "65%" means: don't flip this to real customers and real Razorpay keys yet. The concrete gap to close before that: (1) get a live DB session to actually exercise checkout/refund/webhook end-to-end instead of unit-test-only verification, (2) decide on M1/M6/M9/M10/M11, (3) swap in real Razorpay keys and webhook secret and test a real payment. (SEO explicitly out of scope by client decision — see §4.)
