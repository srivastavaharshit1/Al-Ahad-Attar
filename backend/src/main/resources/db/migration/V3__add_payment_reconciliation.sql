-- V3__add_payment_reconciliation.sql
-- Description: Introduces payment reconciliation columns on payment_intent and the append-only payment_reconciliation_log table.

-- 1. Alter payment_intent table to add reconciliation and lease-fencing fields
ALTER TABLE payment_intent ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(50) NOT NULL DEFAULT 'NONE';
ALTER TABLE payment_intent ADD COLUMN IF NOT EXISTS reconciliation_refund_id VARCHAR(100);
ALTER TABLE payment_intent ADD COLUMN IF NOT EXISTS reconciliation_failure_reason TEXT;
ALTER TABLE payment_intent ADD COLUMN IF NOT EXISTS reconciliation_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE payment_intent ADD COLUMN IF NOT EXISTS reconciliation_lease_token VARCHAR(64);
ALTER TABLE payment_intent ADD COLUMN IF NOT EXISTS reconciliation_lease_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payment_intent ADD COLUMN IF NOT EXISTS reconciliation_last_attempt_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payment_intent ADD COLUMN IF NOT EXISTS reconciliation_resolved_at TIMESTAMP WITH TIME ZONE;

-- Indexes on payment_intent for efficient scheduler and reconciliation queries
CREATE INDEX IF NOT EXISTS idx_payment_intent_recon_status ON payment_intent(reconciliation_status, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_intent_recon_lease ON payment_intent(reconciliation_status, reconciliation_lease_expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_intent_recon_payment_id ON payment_intent(razorpay_payment_id);

-- 2. Create payment_reconciliation_log table for append-only durable audit trails
CREATE TABLE IF NOT EXISTS payment_reconciliation_log (
    id BIGSERIAL PRIMARY KEY,
    payment_intent_id BIGINT NOT NULL REFERENCES payment_intent(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    status_before VARCHAR(50),
    status_after VARCHAR(50),
    payment_id VARCHAR(100),
    refund_id VARCHAR(100),
    amount NUMERIC(10, 2),
    actor VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_recon_log_intent_id ON payment_reconciliation_log(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_recon_log_created_at ON payment_reconciliation_log(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_recon_log_payment_id ON payment_reconciliation_log(payment_id);

