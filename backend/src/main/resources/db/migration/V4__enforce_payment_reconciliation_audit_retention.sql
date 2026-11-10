-- V4__enforce_payment_reconciliation_audit_retention.sql
-- Description: Enforces ON DELETE RESTRICT on payment_reconciliation_log foreign key to guarantee immutable financial audit retention.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Dynamically find and drop any existing foreign key constraint on payment_reconciliation_log(payment_intent_id)
    FOR r IN (
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'payment_reconciliation_log'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'payment_intent_id'
    ) LOOP
        EXECUTE 'ALTER TABLE payment_reconciliation_log DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- Add the explicit, immutable RESTRICT foreign key constraint
ALTER TABLE payment_reconciliation_log
    ADD CONSTRAINT fk_payment_recon_log_intent_restrict
    FOREIGN KEY (payment_intent_id)
    REFERENCES payment_intent(id)
    ON DELETE RESTRICT;

