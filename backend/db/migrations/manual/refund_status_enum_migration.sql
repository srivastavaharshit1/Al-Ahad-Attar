-- Manual migration runbook — RefundStatus enum rename left the DB CHECK constraint stale.
--
-- Background: the Java enum com.alahadattars.enums.RefundStatus was renamed
--   PENDING -> REFUND_REQUIRED
--   COMPLETED -> REFUNDED
-- (see PROJECT_REPORT.md §27, "Cancellation & Refund Policy Overhaul"). This project uses
-- Hibernate `ddl-auto: update` with no Flyway/Liquibase — schema update adds missing
-- tables/columns but never rewrites an existing CHECK constraint, so `orders.refund_status`
-- (and possibly `refund.status`, a separate audit-trail table with the same enum) can be left
-- enforcing the OLD allowed values indefinitely after a rename like this. Symptoms: any row still
-- holding a legacy value 500s every query that loads the full entity, AND the new enum values are
-- silently rejected too (blocking the live workflow going forward, not just old rows) — the two
-- constraint definitions below are constructed so that neither the pre- nor post-rename value can
-- ever be written under the OTHER constraint alone, which is why the fix below bridges through a
-- temporarily widened constraint inside one transaction rather than swapping directly.
--
-- Run this against ANY database still on the pre-rename constraint (a staging environment, a
-- teammate's local Supabase project, a restore from an older backup). Already applied to this
-- project's dev Supabase project — BOTH `orders.refund_status` and `refund.status` — see
-- PROJECT_REPORT.md §29 for both runs' actual output.
--
-- Adjust the table name (`orders` vs `refund`) and re-run per table that needs it — check first
-- with the precheck queries below; do not assume both tables are affected on a database you
-- haven't checked yet.

-- ============================================================
-- STEP 0 — PRECHECK (read-only, run first, every time)
-- ============================================================
-- Expect: only 'PENDING'/'COMPLETED' (if any) as unexpected values; nothing else outside the
-- current 5-value enum. If you see anything else, STOP and investigate before proceeding — this
-- script only knows how to safely migrate the PENDING/COMPLETED case.

SELECT refund_status, COUNT(*) FROM orders GROUP BY refund_status ORDER BY refund_status;
-- SELECT status, COUNT(*) FROM refund GROUP BY status ORDER BY status;  -- if migrating `refund` too

SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'orders'::regclass AND conname = 'orders_refund_status_check';
-- WHERE conrelid = 'refund'::regclass AND conname = 'refund_status_check';  -- if migrating `refund`

-- ============================================================
-- STEP 1 — MIGRATE (orders.refund_status)
-- ============================================================
-- Run as ONE transaction. If any statement fails, the whole thing rolls back — no partial state.

BEGIN;

-- Bridge constraint: union of old ∪ new allowed values, so the pre-rename value being updated
-- and the post-rename value it's becoming are BOTH valid for the moment the UPDATE runs.
ALTER TABLE orders DROP CONSTRAINT orders_refund_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_refund_status_check
    CHECK (refund_status IN (
        'NOT_REQUIRED','PENDING','PROCESSING','COMPLETED','FAILED','REFUND_REQUIRED','REFUNDED'
    ));

UPDATE orders SET refund_status = 'REFUNDED'      WHERE refund_status = 'COMPLETED';
UPDATE orders SET refund_status = 'REFUND_REQUIRED' WHERE refund_status = 'PENDING';
-- Assert expected row count before trusting this further, e.g. in psql: \gset or check
-- `GET DIAGNOSTICS` in a DO block — the executed migration this session asserted exactly 1 row
-- changed via the driver's row-count API; do the equivalent gut-check for your own dataset size
-- before committing.

-- Final constraint: current enum only, legacy values no longer accepted.
ALTER TABLE orders DROP CONSTRAINT orders_refund_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_refund_status_check
    CHECK (refund_status IN ('NOT_REQUIRED','REFUND_REQUIRED','PROCESSING','REFUNDED','FAILED'));

COMMIT;
-- If anything above errors, run: ROLLBACK;

-- ============================================================
-- STEP 2 — VERIFY
-- ============================================================
SELECT refund_status, COUNT(*) FROM orders GROUP BY refund_status ORDER BY refund_status;
-- Expect: no PENDING, no COMPLETED remaining.

SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'orders'::regclass AND conname = 'orders_refund_status_check';
-- Expect: CHECK (refund_status IN ('NOT_REQUIRED','REFUND_REQUIRED','PROCESSING','REFUNDED','FAILED'))

-- ============================================================
-- STEP 3 — repeat for `refund` table if its precheck shows the same drift
-- ============================================================
-- Identical shape, different table/column/constraint name:
--   BEGIN;
--   ALTER TABLE refund DROP CONSTRAINT refund_status_check;
--   ALTER TABLE refund ADD CONSTRAINT refund_status_check
--       CHECK (status IN ('NOT_REQUIRED','PENDING','PROCESSING','COMPLETED','FAILED','REFUND_REQUIRED','REFUNDED'));
--   UPDATE refund SET status = 'REFUNDED'      WHERE status = 'COMPLETED';
--   UPDATE refund SET status = 'REFUND_REQUIRED' WHERE status = 'PENDING';
--   ALTER TABLE refund DROP CONSTRAINT refund_status_check;
--   ALTER TABLE refund ADD CONSTRAINT refund_status_check
--       CHECK (status IN ('NOT_REQUIRED','REFUND_REQUIRED','PROCESSING','REFUNDED','FAILED'));
--   COMMIT;
-- Already applied to this project's dev Supabase DB (1 legacy COMPLETED row -> REFUNDED, 0
-- PENDING rows found) — see PROJECT_REPORT.md §29 for that run's actual output, including the
-- live end-to-end refund retest performed immediately after.
