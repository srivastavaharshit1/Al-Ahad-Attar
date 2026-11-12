package com.alahadattars.billing.online;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import com.alahadattars.billing.reporting.BillingPage;

@Repository
public class OnlineInvoiceJobJdbcRepository {
    public static final int MAX_ATTEMPTS = 8;
    private final JdbcTemplate jdbc;

    public OnlineInvoiceJobJdbcRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Discover paid orders without changing the order/payment source of truth. */
    @Transactional
    public int discoverEligibleOrders(int batchSize) {
        return jdbc.update("""
                INSERT INTO billing_online_invoice_job (order_id, job_status, created_at, updated_at)
                SELECT o.id, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                FROM orders o
                WHERE o.payment_status = 'PAID'
                  AND o.payment_method = 'ONLINE'
                  AND o.transaction_id IS NOT NULL AND BTRIM(o.transaction_id) <> ''
                  AND o.status <> 'CANCELLED'
                  AND o.refund_status = 'NOT_REQUIRED'
                  AND NOT EXISTS (
                      SELECT 1 FROM billing_online_invoice_job j WHERE j.order_id = o.id
                  )
                ORDER BY o.created_at, o.id
                LIMIT ?
                ON CONFLICT (order_id) DO NOTHING
                """, batchSize);
    }

    @Transactional
    public List<OnlineInvoiceJob> claimDue(int batchSize) {
        List<Expired> expired = jdbc.query("""
                SELECT id, attempt_count, processing_started_at
                FROM billing_online_invoice_job
                WHERE job_status = 'PROCESSING'
                  AND processing_started_at < CURRENT_TIMESTAMP - INTERVAL '3 minutes'
                FOR UPDATE SKIP LOCKED
                """, (rs, rowNum) -> new Expired(rs.getLong("id"), rs.getInt("attempt_count"),
                rs.getTimestamp("processing_started_at").toInstant()));
        for (Expired job : expired) {
            String outcome = job.attemptNumber() >= MAX_ATTEMPTS ? "FAILED" : "RETRY_WAIT";
            jdbc.update("""
                    UPDATE billing_online_invoice_job
                    SET job_status = ?, next_attempt_at = CASE WHEN ? = 'RETRY_WAIT' THEN CURRENT_TIMESTAMP ELSE NULL END,
                        processing_started_at = NULL, last_error_code = 'WORKER_LEASE_EXPIRED',
                        last_error_summary = 'Worker lease expired before invoice generation completed',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND job_status = 'PROCESSING'
                    """, outcome, outcome, job.id());
            jdbc.update("""
                    INSERT INTO billing_online_invoice_job_attempt
                        (job_id, attempt_number, outcome, error_code, error_summary, started_at, completed_at)
                    VALUES (?, ?, ?, 'WORKER_LEASE_EXPIRED',
                        'Worker lease expired before invoice generation completed', ?, CURRENT_TIMESTAMP)
                    ON CONFLICT (job_id, attempt_number) DO NOTHING
                    """, job.id(), job.attemptNumber(), outcome, Timestamp.from(job.startedAt()));
        }

        jdbc.update("""
                UPDATE billing_online_invoice_job
                SET job_status = 'FAILED', last_error_code = 'RETRY_LIMIT',
                    last_error_summary = 'Maximum automatic invoice-generation attempts reached',
                    updated_at = CURRENT_TIMESTAMP
                WHERE job_status IN ('PENDING', 'RETRY_WAIT') AND attempt_count >= ?
                """, MAX_ATTEMPTS);

        return jdbc.query("""
                WITH due AS (
                    SELECT id FROM billing_online_invoice_job
                    WHERE job_status IN ('PENDING', 'RETRY_WAIT', 'BLOCKED_CONFIGURATION')
                      AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
                      AND (job_status = 'BLOCKED_CONFIGURATION' OR attempt_count < ?)
                    ORDER BY COALESCE(next_attempt_at, created_at), id
                    FOR UPDATE SKIP LOCKED
                    LIMIT ?
                )
                UPDATE billing_online_invoice_job j
                SET job_status = 'PROCESSING', attempt_count = j.attempt_count + 1,
                    next_attempt_at = NULL, processing_started_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                FROM due WHERE j.id = due.id
                RETURNING j.id, j.order_id, j.attempt_count, j.processing_started_at
                """, (rs, rowNum) -> new OnlineInvoiceJob(rs.getLong("id"), rs.getLong("order_id"),
                rs.getInt("attempt_count"), rs.getTimestamp("processing_started_at").toInstant()), MAX_ATTEMPTS, batchSize);
    }

    public Optional<Long> findExistingOnlineInvoiceId(long orderId) {
        List<Long> ids = jdbc.query("""
                SELECT id FROM billing_invoice WHERE source_type = 'ONLINE_ORDER' AND source_id = ?
                """, (rs, rowNum) -> rs.getLong(1), orderId);
        return ids.stream().findFirst();
    }

    @Transactional
    public void complete(OnlineInvoiceJob job, long invoiceId) {
        int changed = jdbc.update("""
                UPDATE billing_online_invoice_job
                SET job_status = 'COMPLETED', invoice_id = ?, processing_started_at = NULL,
                    next_attempt_at = NULL, last_error_code = NULL, last_error_summary = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND job_status = 'PROCESSING' AND attempt_count = ?
                """, invoiceId, job.id(), job.attemptNumber());
        if (changed != 1) throw new IllegalStateException("Online invoice job lease changed while processing");
        insertAttempt(job, "COMPLETED", null, null);
    }

    @Transactional
    public void skipIneligible(OnlineInvoiceJob job, String reason) {
        int changed = jdbc.update("""
                UPDATE billing_online_invoice_job
                SET job_status = 'SKIPPED_INELIGIBLE', processing_started_at = NULL,
                    last_error_code = 'ORDER_NO_LONGER_ELIGIBLE', last_error_summary = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND job_status = 'PROCESSING' AND attempt_count = ?
                """, truncate(reason), job.id(), job.attemptNumber());
        if (changed != 1) throw new IllegalStateException("Online invoice job lease changed while processing");
        insertAttempt(job, "SKIPPED_INELIGIBLE", "ORDER_NO_LONGER_ELIGIBLE", reason);
    }

    @Transactional
    public void fail(OnlineInvoiceJob job, String errorCode, String summary, Instant nextAttemptAt,
                     boolean configurationBlocked) {
        OnlineInvoiceJobStatus status = configurationBlocked ? OnlineInvoiceJobStatus.BLOCKED_CONFIGURATION
                : job.attemptNumber() >= MAX_ATTEMPTS ? OnlineInvoiceJobStatus.FAILED : OnlineInvoiceJobStatus.RETRY_WAIT;
        Timestamp next = nextAttemptAt == null ? null : Timestamp.from(nextAttemptAt);
        int changed = jdbc.update("""
                UPDATE billing_online_invoice_job
                SET job_status = ?, next_attempt_at = ?, processing_started_at = NULL,
                    last_error_code = ?, last_error_summary = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND job_status = 'PROCESSING' AND attempt_count = ?
                """, status.name(), next, truncate(errorCode, 100), truncate(summary), job.id(), job.attemptNumber());
        if (changed == 1) insertAttempt(job, status.name(), errorCode, summary);
    }

    @Transactional
    public boolean requestRetry(long jobId, long adminUserId, String idempotencyKey) {
        List<RetryRequest> prior = jdbc.query("""
                SELECT job_id, requested_by_user_id FROM billing_online_invoice_job_retry_request
                WHERE idempotency_key = ?
                """, (rs, rowNum) -> new RetryRequest(rs.getLong("job_id"),
                rs.getLong("requested_by_user_id")), idempotencyKey);
        if (!prior.isEmpty()) return prior.get(0).jobId() == jobId && prior.get(0).adminUserId() == adminUserId;
        List<String> current = jdbc.query("SELECT job_status FROM billing_online_invoice_job WHERE id = ? FOR UPDATE",
                (rs, rowNum) -> rs.getString(1), jobId);
        if (current.isEmpty() || !("FAILED".equals(current.get(0)) || "BLOCKED_CONFIGURATION".equals(current.get(0)))) {
            return false;
        }
        jdbc.update("""
                INSERT INTO billing_online_invoice_job_retry_request (job_id, idempotency_key, requested_by_user_id)
                VALUES (?, ?, ?)
                """, jobId, idempotencyKey, adminUserId);
        return jdbc.update("""
                UPDATE billing_online_invoice_job
                SET job_status = 'PENDING', next_attempt_at = NULL, processing_started_at = NULL,
                    requested_by_user_id = ?, last_error_code = NULL, last_error_summary = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND job_status IN ('FAILED', 'BLOCKED_CONFIGURATION')
                """, adminUserId, jobId) == 1;
    }

    public BillingPage<OnlineInvoiceJobView> findPage(OnlineInvoiceJobStatus status, int limit, int offset) {
        String where = status == null ? "" : " WHERE job_status = ? ";
        Long total = status == null
                ? jdbc.queryForObject("SELECT COUNT(*) FROM billing_online_invoice_job", Long.class)
                : jdbc.queryForObject("SELECT COUNT(*) FROM billing_online_invoice_job" + where, Long.class, status.name());
        String sql = """
                SELECT id, order_id, invoice_id, job_status, attempt_count, next_attempt_at,
                       last_error_code, last_error_summary, requested_by_user_id, created_at, updated_at
                FROM billing_online_invoice_job
                """ + where + " ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?";
        List<Object> params = new ArrayList<>();
        if (status != null) params.add(status.name());
        params.add(limit);
        params.add(offset);
        List<OnlineInvoiceJobView> rows = jdbc.query(sql, (rs, rowNum) -> {
            Timestamp next = rs.getTimestamp("next_attempt_at");
            long invoiceId = rs.getLong("invoice_id");
            Long nullableInvoiceId = rs.wasNull() ? null : invoiceId;
            long requester = rs.getLong("requested_by_user_id");
            Long nullableRequester = rs.wasNull() ? null : requester;
            return new OnlineInvoiceJobView(rs.getLong("id"), rs.getLong("order_id"), nullableInvoiceId,
                    OnlineInvoiceJobStatus.valueOf(rs.getString("job_status")), rs.getInt("attempt_count"),
                    next == null ? null : next.toInstant(), rs.getString("last_error_code"),
                    rs.getString("last_error_summary"), nullableRequester,
                    rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
        }, params.toArray());
        return new BillingPage<>(rows, total == null ? 0 : total, limit, offset);
    }

    private void insertAttempt(OnlineInvoiceJob job, String outcome, String code, String summary) {
        jdbc.update("""
                INSERT INTO billing_online_invoice_job_attempt
                    (job_id, attempt_number, outcome, error_code, error_summary, started_at, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (job_id, attempt_number) DO NOTHING
                """, job.id(), job.attemptNumber(), outcome, truncate(code, 100), truncate(summary),
                Timestamp.from(job.startedAt()));
    }

    private static String truncate(String text) {
        return truncate(text, 500);
    }
    private static String truncate(String text, int max) {
        if (text == null) return null;
        String safe = text.replaceAll("[\\r\\n\\t]", " ").trim();
        return safe.length() <= max ? safe : safe.substring(0, max);
    }
    private record Expired(long id, int attemptNumber, Instant startedAt) { }
    private record RetryRequest(long jobId, long adminUserId) { }
}
