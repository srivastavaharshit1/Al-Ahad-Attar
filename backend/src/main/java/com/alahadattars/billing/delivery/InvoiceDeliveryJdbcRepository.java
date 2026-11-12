package com.alahadattars.billing.delivery;

import com.alahadattars.billing.invoice.InvoiceChannel;
import com.alahadattars.billing.invoice.InvoiceJdbcRepository;
import com.alahadattars.billing.invoice.InvoiceListItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class InvoiceDeliveryJdbcRepository {
    private final JdbcTemplate jdbcTemplate;
    private final InvoiceJdbcRepository invoiceRepository;

    public InvoiceDeliveryJdbcRepository(JdbcTemplate jdbcTemplate, InvoiceJdbcRepository invoiceRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.invoiceRepository = invoiceRepository;
    }

    @Transactional
    public void saveConsent(long invoiceId, InvoiceDeliveryChannel channel, String destination,
                            InvoiceConsentStatus status, String wordingVersion, long actorUserId) {
        if (status == InvoiceConsentStatus.GRANTED && (destination == null || destination.isBlank())) {
            throw new IllegalArgumentException("A destination is required when consent is granted");
        }
        jdbcTemplate.update("""
                INSERT INTO billing_invoice_delivery_consent (
                    invoice_id, channel, destination, consent_status, wording_version, captured_by_user_id,
                    captured_at, revoked_at
                ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP,
                    CASE WHEN ? = 'REVOKED' THEN CURRENT_TIMESTAMP ELSE NULL END)
                ON CONFLICT (invoice_id, channel) DO UPDATE
                SET destination = EXCLUDED.destination,
                    consent_status = EXCLUDED.consent_status,
                    wording_version = EXCLUDED.wording_version,
                    captured_by_user_id = EXCLUDED.captured_by_user_id,
                    captured_at = CURRENT_TIMESTAMP,
                    revoked_at = CASE WHEN EXCLUDED.consent_status = 'REVOKED' THEN CURRENT_TIMESTAMP ELSE NULL END
        """, invoiceId, channel.name(), status == InvoiceConsentStatus.GRANTED ? destination : "",
                status.name(), wordingVersion, actorUserId, status.name());
        Long consentId = jdbcTemplate.queryForObject("""
                SELECT id FROM billing_invoice_delivery_consent WHERE invoice_id = ? AND channel = ?
                """, Long.class, invoiceId, channel.name());
        jdbcTemplate.update("""
                INSERT INTO billing_invoice_delivery_consent_event (consent_id, action, actor_user_id, wording_version)
                VALUES (?, ?, ?, ?)
                """, consentId, status.name(), actorUserId, wordingVersion);
    }

    @Transactional
    public InvoiceDeliveryView enqueue(long invoiceId, InvoiceDeliveryChannel channel, long actorUserId, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 160) {
            throw new IllegalArgumentException("A valid delivery idempotency key is required");
        }
        // Serialize enqueue decisions per invoice, so two rapid clicks from separate requests do not
        // produce parallel provider sends with distinct idempotency keys.
        List<Long> lockedInvoice = jdbcTemplate.query("SELECT id FROM billing_invoice WHERE id = ? FOR UPDATE",
                (rs, rowNum) -> rs.getLong(1), invoiceId);
        if (lockedInvoice.isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "Invoice not found");
        }
        Optional<String> grantedDestination = jdbcTemplate.query("""
                SELECT destination FROM billing_invoice_delivery_consent
                WHERE invoice_id = ? AND channel = ? AND consent_status = 'GRANTED'
                """, (rs, rowNum) -> rs.getString("destination"), invoiceId, channel.name()).stream().findFirst();
        String destination = grantedDestination.orElse("");
        InvoiceDeliveryStatus status = grantedDestination.isPresent()
                ? InvoiceDeliveryStatus.PENDING : InvoiceDeliveryStatus.SKIPPED_NO_CONSENT;
        Optional<StoredDelivery> sameKey = findByIdempotencyKey(idempotencyKey);
        if (sameKey.isPresent()) {
            StoredDelivery existing = sameKey.get();
            if (existing.invoiceId() != invoiceId || existing.view().channel() != channel
                    || existing.actorUserId() != actorUserId
                    || !destination.equals(existing.view().destination())) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.CONFLICT,
                        "Delivery idempotency key was reused with a different request");
            }
            return existing.view();
        }
        Optional<InvoiceDeliveryView> latest = findLatestDelivery(invoiceId, channel);
        if (latest.isPresent() && destination.equals(latest.get().destination())
                && isInFlightOrPreviouslyAccepted(latest.get().status())) {
            return latest.get();
        }
        UUID deliveryKey = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO billing_invoice_delivery (
                    delivery_key, idempotency_key, invoice_id, channel, destination_snapshot, status,
                    requested_by_user_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (idempotency_key) DO NOTHING
                """, deliveryKey, idempotencyKey, invoiceId, channel.name(), destination,
                status.name(), actorUserId);
        return findByIdempotencyKey(idempotencyKey).orElseThrow().view();
    }

    @Transactional
    public InvoiceDeliveryView retry(long invoiceId, long deliveryId, long actorUserId, String idempotencyKey) {
        List<RetryTarget> targets = jdbcTemplate.query("""
                SELECT status, channel, destination_snapshot FROM billing_invoice_delivery
                WHERE id = ? AND invoice_id = ? FOR UPDATE
                """, (rs, rowNum) -> new RetryTarget(InvoiceDeliveryStatus.valueOf(rs.getString("status")),
                        InvoiceDeliveryChannel.valueOf(rs.getString("channel")), rs.getString("destination_snapshot")),
                deliveryId, invoiceId);
        if (targets.isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "Delivery record not found");
        }
        RetryTarget target = targets.get(0);
        InvoiceDeliveryStatus previous = target.status();
        if (previous != InvoiceDeliveryStatus.FAILED && previous != InvoiceDeliveryStatus.BLOCKED_CONFIGURATION) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "Only failed or configuration-blocked deliveries can be retried safely");
        }
        if (!consentStillGranted(invoiceId, target.channel(), target.destination())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "Active consent for the original delivery destination is required before retry");
        }
        return enqueue(invoiceId, target.channel(), actorUserId, idempotencyKey);
    }

    private Optional<InvoiceDeliveryView> findLatestDelivery(long invoiceId, InvoiceDeliveryChannel channel) {
        return jdbcTemplate.query("""
                SELECT id, delivery_key, channel, status, attempt_count, destination_snapshot,
                       provider_message_id, last_error_code, last_error_summary, created_at, updated_at
                FROM billing_invoice_delivery WHERE invoice_id = ? AND channel = ?
                ORDER BY created_at DESC, id DESC LIMIT 1
                """, (rs, rowNum) -> mapView(rs), invoiceId, channel.name()).stream().findFirst();
    }

    private Optional<StoredDelivery> findByIdempotencyKey(String idempotencyKey) {
        return jdbcTemplate.query("""
                SELECT id, delivery_key, channel, status, attempt_count, destination_snapshot,
                       provider_message_id, last_error_code, last_error_summary, created_at, updated_at,
                       invoice_id, requested_by_user_id
                FROM billing_invoice_delivery WHERE idempotency_key = ?
                """, (rs, rowNum) -> new StoredDelivery(mapView(rs), rs.getLong("invoice_id"),
                rs.getLong("requested_by_user_id")), idempotencyKey).stream().findFirst();
    }

    private static boolean isInFlightOrPreviouslyAccepted(InvoiceDeliveryStatus status) {
        return status == InvoiceDeliveryStatus.PENDING || status == InvoiceDeliveryStatus.PROCESSING
                || status == InvoiceDeliveryStatus.RETRY_WAIT || status == InvoiceDeliveryStatus.PROVIDER_ACCEPTED
                || status == InvoiceDeliveryStatus.DELIVERED || status == InvoiceDeliveryStatus.AMBIGUOUS;
    }

    public List<InvoiceDeliveryView> findHistory(long invoiceId) {
        return jdbcTemplate.query("""
                SELECT id, delivery_key, channel, status, attempt_count, destination_snapshot,
                       provider_message_id, last_error_code, last_error_summary, created_at, updated_at
                FROM billing_invoice_delivery WHERE invoice_id = ?
                ORDER BY created_at DESC, id DESC
                """, (rs, rowNum) -> mapView(rs), invoiceId);
    }

    public List<InvoiceConsentView> findConsents(long invoiceId) {
        return jdbcTemplate.query("""
                SELECT channel, destination, consent_status, wording_version, captured_at, revoked_at
                FROM billing_invoice_delivery_consent WHERE invoice_id = ? ORDER BY channel
                """, (rs, rowNum) -> {
            java.sql.Timestamp revokedAt = rs.getTimestamp("revoked_at");
            return new InvoiceConsentView(
                    InvoiceDeliveryChannel.valueOf(rs.getString("channel")), rs.getString("destination"),
                    InvoiceConsentStatus.valueOf(rs.getString("consent_status")), rs.getString("wording_version"),
                    rs.getTimestamp("captured_at").toInstant(), revokedAt == null ? null : revokedAt.toInstant());
        }, invoiceId);
    }

    public Optional<InvoiceDeliveryView> findLatest(long invoiceId, InvoiceDeliveryChannel channel) {
        List<InvoiceDeliveryView> rows = jdbcTemplate.query("""
                SELECT id, delivery_key, channel, status, attempt_count, destination_snapshot,
                       provider_message_id, last_error_code, last_error_summary, created_at, updated_at
                FROM billing_invoice_delivery WHERE invoice_id = ? AND channel = ?
                ORDER BY created_at DESC, id DESC LIMIT 1
                """, (rs, rowNum) -> mapView(rs), invoiceId, channel.name());
        return rows.stream().findFirst();
    }

    @Transactional
    public List<InvoiceDeliveryJob> claimDue(int batchSize, int maxAttempts) {
        List<Claimed> expired = jdbcTemplate.query("""
                SELECT id, delivery_key, invoice_id, channel, destination_snapshot, attempt_count, processing_started_at
                FROM billing_invoice_delivery
                WHERE status = 'PROCESSING'
                  AND processing_started_at < CURRENT_TIMESTAMP - INTERVAL '2 minutes'
                FOR UPDATE SKIP LOCKED
                """, (rs, rowNum) -> new Claimed(
                rs.getLong("id"), UUID.fromString(rs.getString("delivery_key")), rs.getLong("invoice_id"),
                InvoiceDeliveryChannel.valueOf(rs.getString("channel")), rs.getString("destination_snapshot"),
                rs.getInt("attempt_count"), rs.getTimestamp("processing_started_at").toInstant()));
        for (Claimed item : expired) {
            jdbcTemplate.update("""
                    UPDATE billing_invoice_delivery
                    SET status = 'AMBIGUOUS', last_error_code = 'WORKER_INTERRUPTED',
                        last_error_summary = 'Worker stopped after claiming a delivery; outcome requires review',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND status = 'PROCESSING'
                    """, item.id());
            jdbcTemplate.update("""
                    INSERT INTO billing_invoice_delivery_attempt (
                        delivery_id, attempt_number, outcome, error_code, error_summary, started_at, completed_at
                    ) VALUES (?, ?, 'AMBIGUOUS', 'WORKER_INTERRUPTED',
                        'Worker stopped after claiming a delivery; outcome requires review', ?, CURRENT_TIMESTAMP)
                    ON CONFLICT (delivery_id, attempt_number) DO NOTHING
                    """, item.id(), item.attemptNumber(), java.sql.Timestamp.from(item.startedAt()));
        }
        jdbcTemplate.update("""
                UPDATE billing_invoice_delivery d
                SET status = 'SKIPPED_NO_CONSENT', updated_at = CURRENT_TIMESTAMP,
                    last_error_code = 'CONSENT_NOT_ACTIVE',
                    last_error_summary = 'Channel consent is not currently granted'
                WHERE d.status IN ('PENDING', 'RETRY_WAIT')
                  AND NOT EXISTS (
                      SELECT 1 FROM billing_invoice_delivery_consent c
                      WHERE c.invoice_id = d.invoice_id AND c.channel = d.channel AND c.consent_status = 'GRANTED'
                  )
                """);
        jdbcTemplate.update("""
                UPDATE billing_invoice_delivery
                SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP,
                    last_error_code = 'RETRY_LIMIT', last_error_summary = 'Maximum automatic attempts reached'
                WHERE status IN ('PENDING', 'RETRY_WAIT') AND attempt_count >= ?
                """, maxAttempts);

        List<Claimed> claimed = jdbcTemplate.query("""
                WITH due AS (
                    SELECT id FROM billing_invoice_delivery
                    WHERE status IN ('PENDING', 'RETRY_WAIT')
                      AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
                      AND attempt_count < ?
                    ORDER BY created_at, id
                    FOR UPDATE SKIP LOCKED
                    LIMIT ?
                )
                UPDATE billing_invoice_delivery d
                SET status = 'PROCESSING', attempt_count = d.attempt_count + 1,
                    processing_started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                FROM due WHERE d.id = due.id
                RETURNING d.id, d.delivery_key, d.invoice_id, d.channel, d.destination_snapshot,
                          d.attempt_count, d.processing_started_at
                """, (rs, rowNum) -> new Claimed(
                rs.getLong("id"), UUID.fromString(rs.getString("delivery_key")), rs.getLong("invoice_id"),
                InvoiceDeliveryChannel.valueOf(rs.getString("channel")), rs.getString("destination_snapshot"),
                rs.getInt("attempt_count"), rs.getTimestamp("processing_started_at").toInstant()), maxAttempts, batchSize);

        List<InvoiceDeliveryJob> jobs = new ArrayList<>();
        for (Claimed item : claimed) {
            InvoiceListItem invoice = invoiceRepository.findHistoryItem(item.invoiceId())
                    .orElseThrow(() -> new IllegalStateException("Invoice for a queued delivery no longer exists"));
            jobs.add(new InvoiceDeliveryJob(item.id(), item.deliveryKey(), item.invoiceId(), item.channel(),
                    item.destination(), item.attemptNumber(), item.startedAt(), invoice));
        }
        return jobs;
    }

    public boolean consentStillGranted(long invoiceId, InvoiceDeliveryChannel channel, String destination) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM billing_invoice_delivery_consent
                WHERE invoice_id = ? AND channel = ? AND consent_status = 'GRANTED' AND destination = ?
                """, Integer.class, invoiceId, channel.name(), destination);
        return count != null && count > 0;
    }

    @Transactional
    public void complete(InvoiceDeliveryJob job, InvoiceDeliveryStatus status, String providerMessageId,
                         String errorCode, String errorSummary, Instant nextAttemptAt) {
        int updated = jdbcTemplate.update("""
                UPDATE billing_invoice_delivery
                SET status = ?, provider_message_id = ?, last_error_code = ?, last_error_summary = ?,
                    next_attempt_at = ?, processing_started_at = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'PROCESSING' AND attempt_count = ?
                """, status.name(), providerMessageId, errorCode, truncate(errorSummary, 500),
                nextAttemptAt == null ? null : java.sql.Timestamp.from(nextAttemptAt), job.id(), job.attemptNumber());
        if (updated != 1) {
            throw new IllegalStateException("Delivery state changed while the worker was processing it");
        }
        jdbcTemplate.update("""
                INSERT INTO billing_invoice_delivery_attempt (
                    delivery_id, attempt_number, outcome, provider_message_id, error_code, error_summary,
                    started_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, job.id(), job.attemptNumber(), status.name(), providerMessageId, errorCode,
                truncate(errorSummary, 500), java.sql.Timestamp.from(job.startedAt()));
    }

    private static InvoiceDeliveryView mapView(ResultSet rs) throws SQLException {
        return new InvoiceDeliveryView(
                rs.getLong("id"), UUID.fromString(rs.getString("delivery_key")),
                InvoiceDeliveryChannel.valueOf(rs.getString("channel")), InvoiceDeliveryStatus.valueOf(rs.getString("status")),
                rs.getInt("attempt_count"), rs.getString("destination_snapshot"), rs.getString("provider_message_id"),
                rs.getString("last_error_code"), rs.getString("last_error_summary"),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }

    private record StoredDelivery(InvoiceDeliveryView view, long invoiceId, long actorUserId) { }
    private record RetryTarget(InvoiceDeliveryStatus status, InvoiceDeliveryChannel channel, String destination) { }
    private record Claimed(long id, UUID deliveryKey, long invoiceId, InvoiceDeliveryChannel channel,
                           String destination, int attemptNumber, Instant startedAt) { }
}
