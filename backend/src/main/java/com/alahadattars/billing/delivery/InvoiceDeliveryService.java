package com.alahadattars.billing.delivery;

import com.alahadattars.billing.invoice.InvoiceJdbcRepository;
import com.alahadattars.billing.invoice.InvoiceListItem;
import com.alahadattars.billing.invoice.InvoicePaperFormat;
import com.alahadattars.billing.invoice.InvoicePdfDocument;
import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class InvoiceDeliveryService {
    private final InvoiceJdbcRepository invoiceRepository;
    private final InvoiceDeliveryJdbcRepository deliveryRepository;
    private final Map<InvoiceDeliveryChannel, InvoiceChannelSender> senders;
    private final InvoiceConsentPolicyProvider consentPolicyProvider;
    private final InvoiceDeliveryRetryPolicy retryPolicy = new InvoiceDeliveryRetryPolicy();

    public InvoiceDeliveryService(
            InvoiceJdbcRepository invoiceRepository,
            InvoiceDeliveryJdbcRepository deliveryRepository,
            List<InvoiceChannelSender> senderList,
            InvoiceConsentPolicyProvider consentPolicyProvider) {
        this.invoiceRepository = invoiceRepository;
        this.deliveryRepository = deliveryRepository;
        this.consentPolicyProvider = consentPolicyProvider;
        this.senders = new EnumMap<>(InvoiceDeliveryChannel.class);
        senderList.forEach(sender -> this.senders.put(sender.channel(), sender));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void recordConsent(AuthenticatedBillingAdmin actor, long invoiceId, InvoiceConsentRequest request) {
        requireInvoice(invoiceId);
        validateDestination(request.channel(), request.status(), request.destination());
        if (request.status() == InvoiceConsentStatus.GRANTED) {
            consentPolicyProvider.requireApprovedWording(request.channel(), request.wordingVersion());
        }
        deliveryRepository.saveConsent(invoiceId, request.channel(), request.destination(), request.status(),
                request.wordingVersion(), actor.userId());
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<InvoiceConsentPolicy> consentPolicies() {
        return consentPolicyProvider.policies();
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public InvoiceDeliveryView enqueue(AuthenticatedBillingAdmin actor, long invoiceId, InvoiceDeliveryChannel channel, String idempotencyKey) {
        requireInvoice(invoiceId);
        return deliveryRepository.enqueue(invoiceId, channel, actor.userId(), idempotencyKey);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public InvoiceDeliveryView retry(AuthenticatedBillingAdmin actor, long invoiceId, long deliveryId,
                                     String idempotencyKey) {
        requireInvoice(invoiceId);
        return deliveryRepository.retry(invoiceId, deliveryId, actor.userId(), idempotencyKey);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<InvoiceDeliveryView> findDeliveryHistory(long invoiceId) {
        requireInvoice(invoiceId);
        return deliveryRepository.findHistory(invoiceId);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<InvoiceConsentView> findConsents(long invoiceId) {
        requireInvoice(invoiceId);
        return deliveryRepository.findConsents(invoiceId);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public Optional<InvoicePdfDocument> findPdf(long invoiceId, InvoicePaperFormat format) {
        requireInvoice(invoiceId);
        return invoiceRepository.findPdf(invoiceId, format);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<InvoiceListItem> findHistory(com.alahadattars.billing.invoice.InvoiceChannel channel,
                                             int limit, int offset) {
        if (limit < 1 || limit > 200 || offset < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid invoice history page");
        }
        return invoiceRepository.findHistory(channel, limit, offset);
    }

    public void processDueDeliveries(int batchSize) {
        List<InvoiceDeliveryJob> jobs = deliveryRepository.claimDue(batchSize, InvoiceDeliveryRetryPolicy.MAX_ATTEMPTS);
        for (InvoiceDeliveryJob job : jobs) {
            process(job);
        }
    }

    private void process(InvoiceDeliveryJob job) {
        if (!deliveryRepository.consentStillGranted(job.invoiceId(), job.channel(), job.destination())) {
            deliveryRepository.complete(job, InvoiceDeliveryStatus.SKIPPED_NO_CONSENT, null,
                    "CONSENT_REVOKED", "Channel consent is no longer granted", null);
            return;
        }
        InvoiceChannelSender sender = senders.get(job.channel());
        if (sender == null || !sender.isAvailable()) {
            deliveryRepository.complete(job, InvoiceDeliveryStatus.BLOCKED_CONFIGURATION, null,
                    "CHANNEL_NOT_CONFIGURED", "Invoice delivery channel is not configured", null);
            return;
        }
        InvoicePdfDocument pdf = invoiceRepository.findPdf(job.invoiceId(), InvoicePaperFormat.A4).orElse(null);
        if (pdf == null) {
            deliveryRepository.complete(job, InvoiceDeliveryStatus.FAILED, null,
                    "A4_PDF_NOT_FOUND", "The stored A4 invoice PDF is missing", null);
            return;
        }
        try {
            String providerId = sender.send(job.invoice(), job.destination(), pdf.content(), job.deliveryKey().toString());
            deliveryRepository.complete(job, InvoiceDeliveryStatus.PROVIDER_ACCEPTED, providerId,
                    null, null, null);
        } catch (InvoiceDeliveryException failure) {
            InvoiceDeliveryStatus status = retryPolicy.statusFor(failure.kind(), job.attemptNumber());
            Instant next = status == InvoiceDeliveryStatus.RETRY_WAIT
                    ? retryPolicy.nextAttemptAt(job.attemptNumber(), Instant.now()) : null;
            deliveryRepository.complete(job, status, null, failure.errorCode(), failure.getMessage(), next);
        } catch (RuntimeException failure) {
            deliveryRepository.complete(job, InvoiceDeliveryStatus.AMBIGUOUS, null,
                    "UNCLASSIFIED_FAILURE", "Delivery outcome is uncertain; manual review is required", null);
        }
    }

    private void requireInvoice(long invoiceId) {
        if (invoiceRepository.findHistoryItem(invoiceId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found");
        }
    }

    private static void validateDestination(InvoiceDeliveryChannel channel, InvoiceConsentStatus status, String destination) {
        if (status != InvoiceConsentStatus.GRANTED) {
            return;
        }
        if (destination == null || destination.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Destination is required for granted consent");
        }
        if (channel == InvoiceDeliveryChannel.EMAIL && !destination.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email destination is invalid");
        }
        if (channel == InvoiceDeliveryChannel.WHATSAPP && !destination.matches("^\\+[1-9][0-9]{7,14}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "WhatsApp destination must use international E.164 format");
        }
    }
}
