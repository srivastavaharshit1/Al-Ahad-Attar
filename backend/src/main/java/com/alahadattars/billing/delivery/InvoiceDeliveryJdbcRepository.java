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
        if (destination == null) {
            destination = "";
        }
        destination = destination.trim();

        List<Long> existingIds = jdbcTemplate.query("""
                SELECT id FROM billing_invoice_delivery_consent WHERE invoice_id = ? AND channel = ?
                """, (rs, rowNum) -> rs.getLong(1), invoiceId, channel.name());

        Long consentId;
        if (!existingIds.isEmpty()) {
            consentId = existingIds.get(0);
            jdbcTemplate.update("""
                    UPDATE billing_invoice_delivery_consent
                    SET destination = CASE WHEN ? <> '' THEN ? ELSE destination END,
                        consent_status = ?,
                        wording_version = ?,
                        captured_by_user_id = ?,
                        captured_at = CURRENT_TIMESTAMP,
                        revoked_at = CASE WHEN ? = 'REVOKED' THEN CURRENT_TIMESTAMP ELSE NULL END
                    WHERE id = ?
                    """, destination, destination, status.name(), wordingVersion, actorUserId, status.name(), consentId);
        } else {
            if (destination.isBlank()) {
                throw new IllegalArgumentException("A valid destination is required to record initial consent");
            }
            jdbcTemplate.update("""
                    INSERT INTO billing_invoice_delivery_consent (
                        invoice_id, channel, destination, consent_status, wording_version, captured_by_user_id,
                        captured_at, revoked_at
                    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP,
                        CASE WHEN ? = 'REVOKED' THEN CURRENT_TIMESTAMP ELSE NULL END)
                    """, invoiceId, channel.name(), destination, status.name(), wordingVersion, actorUserId, status.name());
            consentId = jdbcTemplate.queryForObject("""
                    SELECT id FROM billing_invoice_delivery_consent WHERE invoice_id = ? AND channel = ?
                    """, Long.class, invoiceId, channel.name());
        }

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
        String destination = "";
        Optional<String> invoiceConsentDest = jdbcTemplate.query("""
                SELECT destination FROM billing_invoice_delivery_consent
                WHERE invoice_id = ? AND channel = ?
                """, (rs, rowNum) -> rs.getString("destination"), invoiceId, channel.name()).stream().findFirst();
        if (invoiceConsentDest.isPresent() && !invoiceConsentDest.get().isBlank()) {
            destination = invoiceConsentDest.get();
        } else {
            String col = channel == InvoiceDeliveryChannel.WHATSAPP ? "customer_mobile_snapshot" : "customer_email_snapshot";
            Optional<String> snapshotDest = jdbcTemplate.query(
                    "SELECT " + col + " FROM billing_invoice WHERE id = ?",
                    (rs, rowNum) -> rs.getString(1), invoiceId).stream().filter(s -> s != null && !s.isBlank()).findFirst();
            if (snapshotDest.isPresent()) {
                String raw = snapshotDest.get();
                destination = channel == InvoiceDeliveryChannel.WHATSAPP
                        ? "+" + MetaWhatsAppInvoiceSender.normalizePhone(raw) : raw.trim();
            }
        }

        ConsentEligibility eligibility = checkConsentEligibility(invoiceId, channel, destination);
        InvoiceDeliveryStatus status = (eligibility instanceof ConsentEligibility.Eligible)
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
        try {
            jdbcTemplate.update("""
                    INSERT INTO billing_invoice_delivery (
                        delivery_key, idempotency_key, invoice_id, channel, destination_snapshot, status,
                        requested_by_user_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, deliveryKey, idempotencyKey, invoiceId, channel.name(), destination,
                    status.name(), actorUserId);
        } catch (org.springframework.dao.DuplicateKeyException ignored) {
            // Concurrently inserted with same idempotency key
        }
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

    public Optional<StoredDelivery> findByIdempotencyKey(String idempotencyKey) {
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
        java.sql.Timestamp expiredThreshold = java.sql.Timestamp.from(Instant.now().minus(java.time.Duration.ofMinutes(2)));
        List<Claimed> expired = jdbcTemplate.query("""
                SELECT id, delivery_key, invoice_id, channel, destination_snapshot, attempt_count, processing_started_at
                FROM billing_invoice_delivery
                WHERE status = 'PROCESSING'
                  AND processing_started_at < ?
                FOR UPDATE SKIP LOCKED
                """, (rs, rowNum) -> new Claimed(
                rs.getLong("id"), UUID.fromString(rs.getString("delivery_key")), rs.getLong("invoice_id"),
                InvoiceDeliveryChannel.valueOf(rs.getString("channel")), rs.getString("destination_snapshot"),
                rs.getInt("attempt_count"), rs.getTimestamp("processing_started_at").toInstant()), expiredThreshold);
        for (Claimed item : expired) {
            jdbcTemplate.update("""
                    UPDATE billing_invoice_delivery
                    SET status = 'AMBIGUOUS', last_error_code = 'WORKER_INTERRUPTED',
                        last_error_summary = 'Worker stopped after claiming a delivery; outcome requires review',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND status = 'PROCESSING'
                    """, item.id());
            try {
                jdbcTemplate.update("""
                        INSERT INTO billing_invoice_delivery_attempt (
                            delivery_id, attempt_number, outcome, error_code, error_summary, started_at, completed_at
                        ) VALUES (?, ?, 'AMBIGUOUS', 'WORKER_INTERRUPTED',
                            'Worker stopped after claiming a delivery; outcome requires review', ?, CURRENT_TIMESTAMP)
                        """, item.id(), item.attemptNumber(), java.sql.Timestamp.from(item.startedAt()));
            } catch (org.springframework.dao.DuplicateKeyException ignored) {
            }
        }
        jdbcTemplate.update("""
                UPDATE billing_invoice_delivery d
                SET status = 'SKIPPED_NO_CONSENT', updated_at = CURRENT_TIMESTAMP,
                    last_error_code = 'CONSENT_NOT_ACTIVE',
                    last_error_summary = 'Channel consent is not currently granted or has been revoked'
                WHERE d.status IN ('PENDING', 'RETRY_WAIT')
                  AND (
                      -- Condition 1: Invoice-level destination mismatch
                      EXISTS (
                          SELECT 1 FROM billing_invoice_delivery_consent c
                          WHERE c.invoice_id = d.invoice_id
                            AND c.channel = d.channel
                            AND c.destination <> ''
                            AND c.destination <> d.destination_snapshot
                      )
                      OR
                      -- Condition 2: No valid GRANTED record exists as the latest consent decision for this channel and destination
                      NOT EXISTS (
                          SELECT 1 FROM billing_invoice_delivery_consent c1
                          WHERE c1.channel = d.channel
                            AND c1.destination = d.destination_snapshot
                            AND c1.consent_status = 'GRANTED'
                            AND NOT EXISTS (
                                SELECT 1 FROM billing_invoice_delivery_consent c2
                                WHERE c2.channel = c1.channel
                                  AND c2.destination = c1.destination
                                  AND (c2.captured_at > c1.captured_at OR (c2.captured_at = c1.captured_at AND c2.id > c1.id))
                            )
                      )
                  )
                """);
        jdbcTemplate.update("""
                UPDATE billing_invoice_delivery
                SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP,
                    last_error_code = 'RETRY_LIMIT', last_error_summary = 'Maximum automatic attempts reached'
                WHERE status IN ('PENDING', 'RETRY_WAIT') AND attempt_count >= ?
                """, maxAttempts);

        List<Long> dueIds = jdbcTemplate.query("""
                SELECT id FROM billing_invoice_delivery
                WHERE status IN ('PENDING', 'RETRY_WAIT')
                  AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
                  AND attempt_count < ?
                ORDER BY created_at, id
                LIMIT ?
                FOR UPDATE SKIP LOCKED
                """, (rs, rowNum) -> rs.getLong(1), maxAttempts, batchSize);

        if (dueIds.isEmpty()) {
            return List.of();
        }

        String inClause = java.util.Collections.nCopies(dueIds.size(), "?").stream().collect(java.util.stream.Collectors.joining(","));
        jdbcTemplate.update("UPDATE billing_invoice_delivery "
                + "SET status = 'PROCESSING', attempt_count = attempt_count + 1, "
                + "    processing_started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP "
                + "WHERE id IN (" + inClause + ")", dueIds.toArray());

        List<Claimed> claimed = jdbcTemplate.query(
                "SELECT id, delivery_key, invoice_id, channel, destination_snapshot, attempt_count, processing_started_at "
                + "FROM billing_invoice_delivery WHERE id IN (" + inClause + ") ORDER BY created_at, id",
                (rs, rowNum) -> new Claimed(
                        rs.getLong("id"), UUID.fromString(rs.getString("delivery_key")), rs.getLong("invoice_id"),
                        InvoiceDeliveryChannel.valueOf(rs.getString("channel")), rs.getString("destination_snapshot"),
                        rs.getInt("attempt_count"), rs.getTimestamp("processing_started_at").toInstant()),
                dueIds.toArray());

        List<InvoiceDeliveryJob> jobs = new ArrayList<>();
        for (Claimed item : claimed) {
            InvoiceListItem invoice = invoiceRepository.findHistoryItem(item.invoiceId())
                    .orElseThrow(() -> new IllegalStateException("Invoice for a queued delivery no longer exists"));
            jobs.add(new InvoiceDeliveryJob(item.id(), item.deliveryKey(), item.invoiceId(), item.channel(),
                    item.destination(), item.attemptNumber(), item.startedAt(), invoice));
        }
        return jobs;
    }

    public sealed interface ConsentEligibility {
        record Eligible() implements ConsentEligibility {}
        record Ineligible(String errorCode, String reason) implements ConsentEligibility {}
    }

    public ConsentEligibility checkConsentEligibility(long invoiceId, InvoiceDeliveryChannel channel, String destination) {
        if (destination == null || destination.isBlank()) {
            return new ConsentEligibility.Ineligible("DESTINATION_REQUIRED",
                    "A valid destination is required to evaluate delivery consent");
        }

        // Rule 1: Invoice-level destination mismatch protection
        // If an explicit consent record exists on this invoice for this channel, its recorded destination must match.
        List<ConsentRecord> invoiceConsents = jdbcTemplate.query("""
                SELECT consent_status, destination FROM billing_invoice_delivery_consent
                WHERE invoice_id = ? AND channel = ?
                """, (rs, rowNum) -> new ConsentRecord(rs.getString("consent_status"), rs.getString("destination")),
                invoiceId, channel.name());

        if (!invoiceConsents.isEmpty()) {
            ConsentRecord invoiceRecord = invoiceConsents.get(0);
            if (invoiceRecord.destination() != null && !invoiceRecord.destination().isBlank()
                    && !invoiceRecord.destination().equals(destination)) {
                return new ConsentEligibility.Ineligible("CONSENT_DESTINATION_MISMATCH",
                        "WhatsApp opt-in on this invoice was recorded for a different destination number");
            }
        }

        // Rule 2: Deterministic destination-level resolution across the system.
        // Identify the latest applicable consent decision for the exact channel and normalized destination.
        // A newer REVOKED or DECLINED decision blocks sending on ANY invoice (including older invoices).
        // A newer explicit GRANTED decision restores eligibility if the customer opted in again.
        List<ConsentRecord> latestConsents = jdbcTemplate.query("""
                SELECT consent_status, destination FROM billing_invoice_delivery_consent
                WHERE channel = ? AND destination = ?
                ORDER BY captured_at DESC, id DESC
                LIMIT 1
                """, (rs, rowNum) -> new ConsentRecord(rs.getString("consent_status"), rs.getString("destination")),
                channel.name(), destination);

        if (latestConsents.isEmpty()) {
            return new ConsentEligibility.Ineligible("CONSENT_REQUIRED",
                    "Explicit affirmative customer consent is required before sending WhatsApp invoice");
        }

        ConsentRecord latestRecord = latestConsents.get(0);
        if ("REVOKED".equals(latestRecord.status())) {
            return new ConsentEligibility.Ineligible("CONSENT_REVOKED",
                    "Customer has explicitly revoked WhatsApp delivery consent for this destination");
        }
        if ("DECLINED".equals(latestRecord.status())) {
            return new ConsentEligibility.Ineligible("CONSENT_DECLINED",
                    "Customer has explicitly declined WhatsApp delivery consent for this destination");
        }
        if ("GRANTED".equals(latestRecord.status())) {
            return new ConsentEligibility.Eligible();
        }

        return new ConsentEligibility.Ineligible("CONSENT_NOT_ACTIVE", "Consent is not currently active");
    }

    public boolean consentStillGranted(long invoiceId, InvoiceDeliveryChannel channel, String destination) {
        return checkConsentEligibility(invoiceId, channel, destination) instanceof ConsentEligibility.Eligible;
    }

    public boolean isConsentExplicitlyRevokedOrDeclined(long invoiceId, InvoiceDeliveryChannel channel, String destination) {
        ConsentEligibility eligibility = checkConsentEligibility(invoiceId, channel, destination);
        if (eligibility instanceof ConsentEligibility.Ineligible ineligible) {
            return "CONSENT_REVOKED".equals(ineligible.errorCode()) || "CONSENT_DECLINED".equals(ineligible.errorCode());
        }
        return false;
    }

    private record ConsentRecord(String status, String destination) {}

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

    @Transactional
    public InvoiceDeliveryView recordBlockedConsent(long invoiceId, InvoiceDeliveryChannel channel,
                                                    String destination, long actorUserId,
                                                    String idempotencyKey, String errorCode, String errorSummary) {
        Optional<StoredDelivery> existing = findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            return existing.get().view();
        }
        UUID deliveryKey = UUID.randomUUID();
        try {
            jdbcTemplate.update("""
                    INSERT INTO billing_invoice_delivery (
                        delivery_key, idempotency_key, invoice_id, channel, destination_snapshot, status,
                        attempt_count, last_error_code, last_error_summary, requested_by_user_id,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'SKIPPED_NO_CONSENT', 0, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, deliveryKey, idempotencyKey, invoiceId, channel.name(), destination,
                    errorCode, truncate(errorSummary, 500), actorUserId);
        } catch (org.springframework.dao.DuplicateKeyException ignored) {
            // Concurrently recorded with the same idempotency key
        }
        return findByIdempotencyKey(idempotencyKey).orElseThrow().view();
    }

    @Transactional
    public InvoiceDeliveryView recordBlockedConfiguration(long invoiceId, InvoiceDeliveryChannel channel,
                                                          String destination, long actorUserId,
                                                          String idempotencyKey, String errorCode, String errorSummary) {
        Optional<StoredDelivery> existing = findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            return existing.get().view();
        }
        UUID deliveryKey = UUID.randomUUID();
        try {
            jdbcTemplate.update("""
                    INSERT INTO billing_invoice_delivery (
                        delivery_key, idempotency_key, invoice_id, channel, destination_snapshot, status,
                        attempt_count, last_error_code, last_error_summary, requested_by_user_id,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'BLOCKED_CONFIGURATION', 0, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, deliveryKey, idempotencyKey, invoiceId, channel.name(), destination,
                    errorCode, truncate(errorSummary, 500), actorUserId);
        } catch (org.springframework.dao.DuplicateKeyException ignored) {
            // Concurrently recorded with the same idempotency key
        }
        return findByIdempotencyKey(idempotencyKey).orElseThrow().view();
    }

    @Transactional
    public InvoiceDeliveryView recordFailedDelivery(long invoiceId, InvoiceDeliveryChannel channel,
                                                    String destination, long actorUserId,
                                                    String idempotencyKey, String errorCode, String errorSummary) {
        Optional<StoredDelivery> existing = findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            return existing.get().view();
        }
        UUID deliveryKey = UUID.randomUUID();
        try {
            jdbcTemplate.update("""
                    INSERT INTO billing_invoice_delivery (
                        delivery_key, idempotency_key, invoice_id, channel, destination_snapshot, status,
                        attempt_count, last_error_code, last_error_summary, requested_by_user_id,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'FAILED', 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, deliveryKey, idempotencyKey, invoiceId, channel.name(), destination,
                    errorCode, truncate(errorSummary, 500), actorUserId);
        } catch (org.springframework.dao.DuplicateKeyException ignored) {
            // Concurrently recorded with the same idempotency key
        }
        return findByIdempotencyKey(idempotencyKey).orElseThrow().view();
    }

    public sealed interface ImmediateClaimResult {
        record Claimed(InvoiceDeliveryJob job) implements ImmediateClaimResult {}
        record Terminal(InvoiceDeliveryView view) implements ImmediateClaimResult {}
    }

    @Transactional
    public ImmediateClaimResult prepareImmediateJob(
            long invoiceId,
            InvoiceDeliveryChannel channel,
            String destination,
            long actorUserId,
            String idempotencyKey,
            boolean senderAvailable,
            boolean hasA4Pdf,
            InvoiceListItem invoice) {
        // 1. Lock invoice row to serialize concurrent delivery requests for this invoice
        List<Long> lockedInvoice = jdbcTemplate.query("SELECT id FROM billing_invoice WHERE id = ? FOR UPDATE",
                (rs, rowNum) -> rs.getLong(1), invoiceId);
        if (lockedInvoice.isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "Invoice not found");
        }

        // 2. Check existing delivery by idempotency key
        Optional<StoredDelivery> existing = findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            StoredDelivery stored = existing.get();
            InvoiceDeliveryView existingView = stored.view();
            if (stored.invoiceId() != invoiceId || existingView.channel() != channel
                    || !destination.equals(existingView.destination())) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.CONFLICT,
                        "Delivery idempotency key was reused with a different invoice, channel, or destination");
            }
            if (isInFlightOrPreviouslyAccepted(existingView.status())) {
                return new ImmediateClaimResult.Terminal(existingView);
            }
        }

        // 3. Check latest delivery for this invoice and channel
        Optional<InvoiceDeliveryView> latest = findLatestDelivery(invoiceId, channel);
        if (latest.isPresent()) {
            InvoiceDeliveryView latestView = latest.get();
            if (destination.equals(latestView.destination()) && isInFlightOrPreviouslyAccepted(latestView.status())) {
                return new ImmediateClaimResult.Terminal(latestView);
            }
        }

        // 4. Messaging eligibility: affirmative consent verification
        ConsentEligibility eligibility = checkConsentEligibility(invoiceId, channel, destination);
        if (eligibility instanceof ConsentEligibility.Ineligible ineligible) {
            InvoiceDeliveryView view = recordBlockedConsent(invoiceId, channel, destination,
                    actorUserId, idempotencyKey, ineligible.errorCode(), ineligible.reason());
            return new ImmediateClaimResult.Terminal(view);
        }

        // 5. Messaging eligibility: sender and approved template configuration check
        if (!senderAvailable) {
            InvoiceDeliveryView view = recordBlockedConfiguration(invoiceId, channel, destination,
                    actorUserId, idempotencyKey, "WHATSAPP_NOT_CONFIGURED",
                    "Invoice WhatsApp delivery is not configured on the server");
            return new ImmediateClaimResult.Terminal(view);
        }

        // 6. Messaging eligibility: authoritative A4 PDF existence check
        if (!hasA4Pdf) {
            InvoiceDeliveryView view = recordFailedDelivery(invoiceId, channel, destination,
                    actorUserId, idempotencyKey, "A4_PDF_NOT_FOUND",
                    "The stored A4 invoice PDF is missing");
            return new ImmediateClaimResult.Terminal(view);
        }

        // 7. Claim or create job in PROCESSING state
        InvoiceDeliveryJob job = createOrClaimImmediateJob(invoiceId, channel, destination,
                actorUserId, idempotencyKey, invoice);
        return new ImmediateClaimResult.Claimed(job);
    }

    @Transactional
    public InvoiceDeliveryJob createOrClaimImmediateJob(long invoiceId, InvoiceDeliveryChannel channel,
                                                         String destination, long actorUserId,
                                                         String idempotencyKey, InvoiceListItem invoice) {
        Optional<StoredDelivery> existing = findByIdempotencyKey(idempotencyKey);
        Long deliveryId;
        UUID deliveryKey;
        int attemptCount = 1;
        Instant startedAt = Instant.now();

        if (existing.isPresent()) {
            deliveryId = existing.get().view().id();
            deliveryKey = existing.get().view().deliveryKey();
            attemptCount = existing.get().view().attemptCount() + 1;
            jdbcTemplate.update("""
                    UPDATE billing_invoice_delivery
                    SET status = 'PROCESSING', attempt_count = ?, processing_started_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """, attemptCount, deliveryId);
        } else {
            deliveryKey = UUID.randomUUID();
            jdbcTemplate.update("""
                    INSERT INTO billing_invoice_delivery (
                        delivery_key, idempotency_key, invoice_id, channel, destination_snapshot, status,
                        attempt_count, processing_started_at, requested_by_user_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'PROCESSING', 1, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """, deliveryKey, idempotencyKey, invoiceId, channel.name(), destination, actorUserId);
            deliveryId = jdbcTemplate.queryForObject(
                    "SELECT id FROM billing_invoice_delivery WHERE idempotency_key = ?", Long.class, idempotencyKey);
        }
        return new InvoiceDeliveryJob(deliveryId, deliveryKey, invoiceId, channel, destination,
                attemptCount, startedAt, invoice);
    }

    @Transactional
    public boolean updateStatusByProviderMessageId(String providerMessageId, InvoiceDeliveryStatus status,
                                                   String errorCode, String errorSummary) {
        if (providerMessageId == null || providerMessageId.isBlank()) {
            return false;
        }
        int updated = jdbcTemplate.update("""
                UPDATE billing_invoice_delivery
                SET status = CASE
                        WHEN status = 'DELIVERED' THEN 'DELIVERED'
                        WHEN ? = 'DELIVERED' THEN 'DELIVERED'
                        WHEN ? = 'FAILED' AND status != 'DELIVERED' THEN 'FAILED'
                        WHEN ? = 'PROVIDER_ACCEPTED' AND status IN ('PENDING', 'PROCESSING', 'AMBIGUOUS') THEN 'PROVIDER_ACCEPTED'
                        ELSE status
                    END,
                    last_error_code = CASE
                        WHEN status = 'DELIVERED' OR ? = 'DELIVERED' THEN NULL
                        WHEN ? = 'FAILED' AND status != 'DELIVERED' THEN COALESCE(?, last_error_code)
                        ELSE last_error_code
                    END,
                    last_error_summary = CASE
                        WHEN status = 'DELIVERED' OR ? = 'DELIVERED' THEN NULL
                        WHEN ? = 'FAILED' AND status != 'DELIVERED' THEN COALESCE(?, last_error_summary)
                        ELSE last_error_summary
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE provider_message_id = ?
                """,
                status.name(), status.name(), status.name(), status.name(),
                status.name(), status.name(), errorCode, status.name(), truncate(errorSummary, 500),
                providerMessageId);
        return updated > 0;
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }

    public record StoredDelivery(InvoiceDeliveryView view, long invoiceId, long actorUserId) { }
    private record RetryTarget(InvoiceDeliveryStatus status, InvoiceDeliveryChannel channel, String destination) { }
    private record Claimed(long id, UUID deliveryKey, long invoiceId, InvoiceDeliveryChannel channel,
                           String destination, int attemptNumber, Instant startedAt) { }
}
