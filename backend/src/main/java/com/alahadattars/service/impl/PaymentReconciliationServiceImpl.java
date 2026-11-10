package com.alahadattars.service.impl;

import com.alahadattars.dto.admin.reconciliation.AdminManualResolveRequest;
import com.alahadattars.dto.admin.reconciliation.PaymentReconciliationLogResponse;
import com.alahadattars.dto.admin.reconciliation.PaymentReconciliationResponse;
import com.alahadattars.dto.email.AdminStuckCheckoutEmailData;
import com.alahadattars.dto.email.RefundSuccessfulEmailData;
import com.alahadattars.dto.payment.RefundResult;
import com.alahadattars.entity.AdminNotification;
import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.entity.PaymentReconciliationLog;
import com.alahadattars.entity.WebhookEvent;
import com.alahadattars.enums.ReconciliationStatus;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.AdminNotificationRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.PaymentReconciliationLogRepository;
import com.alahadattars.repository.WebhookEventRepository;
import com.alahadattars.service.EmailService;
import com.alahadattars.service.PaymentReconciliationService;
import com.alahadattars.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentReconciliationServiceImpl implements PaymentReconciliationService {

    private final PaymentIntentRepository paymentIntentRepository;
    private final PaymentReconciliationLogRepository reconciliationLogRepository;
    private final WebhookEventRepository webhookEventRepository;
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final EmailService emailService;
    private final AdminNotificationRepository adminNotificationRepository;
    private final PlatformTransactionManager transactionManager;

    @Value("${app.payment.reconciliation.grace-period-minutes:15}")
    private int gracePeriodMinutes = 15;

    @Value("${app.payment.reconciliation.lease-duration-minutes:5}")
    private int leaseDurationMinutes = 5;

    @Value("${app.payment.reconciliation.max-auto-retries:3}")
    private int maxAutoRetries = 3;

    @Override
    public int processEligibleOrphanPayments() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime gracePeriodCutoff = now.minusMinutes(gracePeriodMinutes);
        LocalDateTime retryCutoff = now.minusMinutes(leaseDurationMinutes);

        List<PaymentIntent> candidates = paymentIntentRepository.findEligibleForReconciliation(
                gracePeriodCutoff, now, retryCutoff, maxAutoRetries);

        if (candidates.isEmpty()) {
            return 0;
        }

        log.info("Found {} candidate payment intent(s) eligible for reconciliation evaluation.", candidates.size());
        int processedCount = 0;

        for (PaymentIntent candidate : candidates) {
            try {
                processSingleIntent(candidate.getId());
                processedCount++;
            } catch (Exception e) {
                log.error("Unhandled error processing reconciliation for PaymentIntent #{}: {}",
                        candidate.getId(), e.getMessage(), e);
            }
        }

        return processedCount;
    }

    @Override
    public void processSingleIntent(Long paymentIntentId) {
        TransactionTemplate txRequiresNew = new TransactionTemplate(transactionManager);
        txRequiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        // --- PHASE 1: SHORT TRANSACTION (Lock, Validate, Claim Lease & Fencing Token) ---
        LeaseClaim claim = txRequiresNew.execute(status -> claimLeaseInTx(paymentIntentId));
        if (claim == null || !claim.isClaimed()) {
            return; // Order found, already claimed, or lease active
        }

        String leaseToken = claim.getLeaseToken();
        String paymentId = claim.getPaymentId();
        BigDecimal amount = claim.getAmount();

        // --- PHASE 2: EXTERNAL GATEWAY CALL (NO DATABASE CONNECTION HELD) ---
        GatewayReconciliationOutcome gatewayOutcome = evaluateGatewayRefund(paymentId, amount);

        // --- PHASE 3: SHORT TRANSACTION (Settle Outcome with Fencing Token Verification) ---
        txRequiresNew.execute(status -> {
            settleOutcomeInTx(paymentIntentId, leaseToken, gatewayOutcome, paymentId, amount, "SYSTEM_SCHEDULER");
            return null;
        });
    }

    private LeaseClaim claimLeaseInTx(Long paymentIntentId) {
        PaymentIntent intent = paymentIntentRepository.findByIdForUpdate(paymentIntentId).orElse(null);
        if (intent == null) {
            return null;
        }

        // Guard 1: Verify whether an actual Order was already created for this payment
        String paymentId = resolvePaymentId(intent);
        if (paymentId != null && orderRepository.existsByTransactionId(paymentId)) {
            log.info("PaymentIntent #{} already backed an Order with transaction ID {}. Marking EXEMPT_ORDER_FOUND.",
                    intent.getId(), paymentId);
            intent.setReconciliationStatus(ReconciliationStatus.EXEMPT_ORDER_FOUND);
            intent.setConsumed(true);
            saveLog(intent, "EXEMPTION_DETECTED", intent.getReconciliationStatus().name(),
                    ReconciliationStatus.EXEMPT_ORDER_FOUND.name(), paymentId, null, intent.getAmount(),
                    "SYSTEM_SCHEDULER", "Order found in database matching payment ID. Zero refund required.");
            paymentIntentRepository.save(intent);
            return null;
        }

        LocalDateTime now = LocalDateTime.now();

        // Guard 2: Lease Fencing. If already PROCESSING with unexpired lease, skip (another worker is on it)
        if (intent.getReconciliationStatus() == ReconciliationStatus.PROCESSING
                && intent.getReconciliationLeaseExpiresAt() != null
                && intent.getReconciliationLeaseExpiresAt().isAfter(now)) {
            log.debug("PaymentIntent #{} has active lease expiring at {}. Skipping.",
                    intent.getId(), intent.getReconciliationLeaseExpiresAt());
            return null;
        }

        // Guard 3: Terminal States
        if (intent.getReconciliationStatus() == ReconciliationStatus.REFUNDED
                || intent.getReconciliationStatus() == ReconciliationStatus.EXEMPT_ORDER_FOUND
                || intent.getReconciliationStatus() == ReconciliationStatus.MANUALLY_RESOLVED) {
            return null;
        }

        // Guard 4: Require confirmed captured payment evidence
        if (paymentId == null) {
            log.warn("PaymentIntent #{} has no captured payment ID evidence yet. Skipping.", intent.getId());
            return null;
        }

        // Claim lease with unique fencing token
        String leaseToken = UUID.randomUUID().toString();
        String statusBefore = intent.getReconciliationStatus().name();

        intent.setReconciliationStatus(ReconciliationStatus.PROCESSING);
        intent.setReconciliationLeaseToken(leaseToken);
        intent.setReconciliationLeaseExpiresAt(now.plusMinutes(leaseDurationMinutes));
        intent.setConsumed(true); // Concurrency tripwire for late-arriving browser checkout
        intent.setReconciliationAttempts(intent.getReconciliationAttempts() + 1);
        intent.setReconciliationLastAttemptAt(now);
        intent.setRazorpayPaymentId(paymentId);

        paymentIntentRepository.save(intent);

        saveLog(intent, "CLAIM_LEASE", statusBefore, ReconciliationStatus.PROCESSING.name(),
                paymentId, intent.getReconciliationRefundId(), intent.getAmount(),
                "SYSTEM_SCHEDULER", "Acquired reconciliation lease lock with token " + leaseToken);

        return LeaseClaim.builder()
                .claimed(true)
                .leaseToken(leaseToken)
                .paymentId(paymentId)
                .amount(intent.getAmount())
                .build();
    }

    private String resolvePaymentId(PaymentIntent intent) {
        if (intent.getRazorpayPaymentId() != null && !intent.getRazorpayPaymentId().isBlank()) {
            return intent.getRazorpayPaymentId();
        }
        // Look up payment ID from captured webhook events
        List<WebhookEvent> capturedEvents = webhookEventRepository.findAll().stream()
                .filter(w -> intent.getRazorpayOrderId().equals(w.getOrderId()) && "payment.captured".equals(w.getEventType()))
                .toList();
        if (!capturedEvents.isEmpty()) {
            return capturedEvents.get(0).getPaymentId();
        }
        return null;
    }

    private GatewayReconciliationOutcome evaluateGatewayRefund(String paymentId, BigDecimal amount) {
        try {
            // STEP 1: Verify existing refunds at Razorpay first (Crash B recovery & duplicate prevention)
            Optional<RefundResult> existing = paymentService.checkExistingRefund(paymentId, amount);
            if (existing.isPresent()) {
                RefundResult res = existing.get();
                if (res.getOutcome() == RefundResult.RefundOutcome.PROCESSED) {
                    return GatewayReconciliationOutcome.builder()
                            .action(GatewayAction.ADOPT_PROCESSED)
                            .refundId(res.getRefundId())
                            .build();
                } else if (res.getOutcome() == RefundResult.RefundOutcome.SUCCESS) {
                    // Gateway has it registered, but not yet settled
                    return GatewayReconciliationOutcome.builder()
                            .action(GatewayAction.ADOPT_PENDING)
                            .refundId(res.getRefundId())
                            .details("Refund is in flight at gateway (status non-terminal)")
                            .build();
                }
            }

            // STEP 2: No existing refund found on Razorpay — dispatch fresh refund call
            RefundResult refundCall = paymentService.initiateRefund(paymentId, amount);

            if (refundCall.getOutcome() == RefundResult.RefundOutcome.PROCESSED) {
                return GatewayReconciliationOutcome.builder()
                        .action(GatewayAction.REFUND_PROCESSED)
                        .refundId(refundCall.getRefundId())
                        .build();
            } else if (refundCall.getOutcome() == RefundResult.RefundOutcome.SUCCESS) {
                // Initiated/submitted, awaiting bank settlement
                return GatewayReconciliationOutcome.builder()
                        .action(GatewayAction.REFUND_PENDING)
                        .refundId(refundCall.getRefundId())
                        .details("Refund initiated at Razorpay, awaiting processed confirmation")
                        .build();
            } else if (refundCall.getOutcome() == RefundResult.RefundOutcome.UNKNOWN_TIMEOUT) {
                return GatewayReconciliationOutcome.builder()
                        .action(GatewayAction.TIMEOUT_PENDING)
                        .details(refundCall.getErrorMessage())
                        .build();
            } else {
                return GatewayReconciliationOutcome.builder()
                        .action(GatewayAction.FAILED)
                        .details(refundCall.getErrorMessage())
                        .build();
            }
        } catch (Exception e) {
            log.error("Error during gateway refund evaluation for payment {}: {}", paymentId, e.getMessage(), e);
            return GatewayReconciliationOutcome.builder()
                    .action(GatewayAction.TIMEOUT_PENDING)
                    .details("Unexpected exception: " + e.getMessage())
                    .build();
        }
    }

    private void settleOutcomeInTx(Long paymentIntentId, String leaseToken, GatewayReconciliationOutcome outcome,
                                   String paymentId, BigDecimal amount, String actor) {
        PaymentIntent intent = paymentIntentRepository.findByIdForUpdate(paymentIntentId).orElse(null);
        if (intent == null) {
            return;
        }

        // Fencing Token Ownership Check: Stale worker protection
        if (!leaseToken.equals(intent.getReconciliationLeaseToken())) {
            log.warn("FENCING CONFLICT on PaymentIntent #{}: Expected token {} but found {}. Discarding write.",
                    paymentIntentId, leaseToken, intent.getReconciliationLeaseToken());
            return;
        }

        // Invariant: Do not overwrite a terminal state if reached concurrently
        if (intent.getReconciliationStatus() == ReconciliationStatus.REFUNDED
                || intent.getReconciliationStatus() == ReconciliationStatus.EXEMPT_ORDER_FOUND
                || intent.getReconciliationStatus() == ReconciliationStatus.MANUALLY_RESOLVED) {
            log.info("PaymentIntent #{} already settled to {}. Skipping worker write.",
                    paymentIntentId, intent.getReconciliationStatus());
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        String statusBefore = intent.getReconciliationStatus().name();

        switch (outcome.getAction()) {
            case ADOPT_PROCESSED, REFUND_PROCESSED -> {
                // ONLY 'processed' qualifies for the internal REFUNDED state
                intent.setReconciliationStatus(ReconciliationStatus.REFUNDED);
                intent.setReconciliationRefundId(outcome.getRefundId());
                intent.setReconciliationResolvedAt(now);
                intent.setReconciliationFailureReason(null);
                intent.setReconciliationLeaseToken(null);
                intent.setReconciliationLeaseExpiresAt(null);

                saveLog(intent, "REFUND_SUCCESS", statusBefore, ReconciliationStatus.REFUNDED.name(),
                        paymentId, outcome.getRefundId(), amount, actor,
                        outcome.getAction() == GatewayAction.ADOPT_PROCESSED
                                ? "Discovered and adopted existing processed refund from gateway."
                                : "Razorpay refund completed successfully with status 'processed'.");

                sendCustomerRefundEmail(intent, outcome.getRefundId(), amount);
                createAdminNotification("AUTO_REFUND_COMPLETED",
                        String.format("Automatic refund of Rs. %s completed for abandoned payment %s (Order %s). Refund ID: %s.",
                                amount, paymentId, intent.getRazorpayOrderId(), outcome.getRefundId()));
            }
            case ADOPT_PENDING, REFUND_PENDING, TIMEOUT_PENDING -> {
                // 'created', 'pending' and 'submitted' remain PENDING_CONFIRMATION
                intent.setReconciliationStatus(ReconciliationStatus.PENDING_CONFIRMATION);
                if (outcome.getRefundId() != null) {
                    intent.setReconciliationRefundId(outcome.getRefundId());
                }
                intent.setReconciliationFailureReason(outcome.getDetails());
                // Leave lease active for a brief settling window or clear to allow verification query
                intent.setReconciliationLeaseExpiresAt(now.plusMinutes(leaseDurationMinutes));

                saveLog(intent, "REFUND_PENDING", statusBefore, ReconciliationStatus.PENDING_CONFIRMATION.name(),
                        paymentId, outcome.getRefundId(), amount, actor,
                        "Refund in flight or gateway timeout. Outcome awaiting confirmation: " + outcome.getDetails());
            }
            case FAILED -> {
                intent.setReconciliationStatus(ReconciliationStatus.FAILED);
                intent.setReconciliationFailureReason(outcome.getDetails());
                intent.setReconciliationLeaseToken(null);
                intent.setReconciliationLeaseExpiresAt(null);

                saveLog(intent, "REFUND_FAILED", statusBefore, ReconciliationStatus.FAILED.name(),
                        paymentId, null, amount, actor,
                        "Gateway refund failed definitively: " + outcome.getDetails());

                sendAdminStuckAlert(intent, paymentId, amount);
                createAdminNotification("PAYMENT_RECONCILIATION_FAILED",
                        String.format("CRITICAL: Automated refund failed for captured payment %s (Order %s) for Rs. %s: %s",
                                paymentId, intent.getRazorpayOrderId(), amount, outcome.getDetails()));
            }
        }

        paymentIntentRepository.save(intent);
    }

    @Override
    public void reconcileRefundFromWebhook(String razorpayRefundId, String paymentId, String razorpayStatus) {
        if (paymentId == null && razorpayRefundId == null) {
            return;
        }

        TransactionTemplate txRequiresNew = new TransactionTemplate(transactionManager);
        txRequiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        txRequiresNew.execute(status -> {
            // Find PaymentIntent matching payment ID or refund ID
            PaymentIntent intent = null;
            if (paymentId != null) {
                intent = paymentIntentRepository.findByRazorpayPaymentIdForUpdate(paymentId).orElse(null);
            }
            if (intent == null && razorpayRefundId != null) {
                intent = paymentIntentRepository.findByReconciliationRefundId(razorpayRefundId).orElse(null);
            }
            if (intent == null) {
                log.info("No PaymentIntent found for orphan refund webhook (payment: {}, refund: {}). Ignoring.",
                        paymentId, razorpayRefundId);
                return null;
            }

            // Guard: Verify order doesn't exist
            if (orderRepository.existsByTransactionId(intent.getRazorpayPaymentId())) {
                log.warn("Webhook routing anomaly: Order exists for payment {}. Webhook must be processed by Order flow.",
                        intent.getRazorpayPaymentId());
                return null;
            }

            // Guard: Terminal state idempotency
            if (intent.getReconciliationStatus() == ReconciliationStatus.REFUNDED) {
                log.info("PaymentIntent #{} already REFUNDED. Duplicate webhook for refund {} ignored.",
                        intent.getId(), razorpayRefundId);
                return null;
            }

            LocalDateTime now = LocalDateTime.now();
            String statusBefore = intent.getReconciliationStatus().name();

            if ("processed".equalsIgnoreCase(razorpayStatus)) {
                // Terminal Success
                intent.setReconciliationStatus(ReconciliationStatus.REFUNDED);
                intent.setReconciliationRefundId(razorpayRefundId);
                intent.setReconciliationResolvedAt(now);
                intent.setReconciliationFailureReason(null);
                intent.setReconciliationLeaseToken(null);
                intent.setReconciliationLeaseExpiresAt(null);

                saveLog(intent, "WEBHOOK_REFUND_PROCESSED", statusBefore, ReconciliationStatus.REFUNDED.name(),
                        intent.getRazorpayPaymentId(), razorpayRefundId, intent.getAmount(), "WEBHOOK",
                        "Razorpay webhook 'refund.processed' confirmed bank settlement.");

                sendCustomerRefundEmail(intent, razorpayRefundId, intent.getAmount());
                createAdminNotification("AUTO_REFUND_COMPLETED",
                        String.format("Webhook confirmed refund %s of Rs. %s for payment %s.",
                                razorpayRefundId, intent.getAmount(), intent.getRazorpayPaymentId()));
            } else if ("failed".equalsIgnoreCase(razorpayStatus)) {
                // Invariant: refund.failed must NEVER mark a payment as REFUNDED!
                intent.setReconciliationStatus(ReconciliationStatus.FAILED);
                intent.setReconciliationFailureReason("Razorpay reported refund.failed via webhook.");
                intent.setReconciliationLeaseToken(null);
                intent.setReconciliationLeaseExpiresAt(null);

                saveLog(intent, "WEBHOOK_REFUND_FAILED", statusBefore, ReconciliationStatus.FAILED.name(),
                        intent.getRazorpayPaymentId(), razorpayRefundId, intent.getAmount(), "WEBHOOK",
                        "Razorpay webhook reported refund failed.");

                sendAdminStuckAlert(intent, intent.getRazorpayPaymentId(), intent.getAmount());
                createAdminNotification("PAYMENT_RECONCILIATION_FAILED",
                        String.format("CRITICAL: Webhook reported refund %s FAILED for payment %s (Order %s).",
                                razorpayRefundId, intent.getRazorpayPaymentId(), intent.getRazorpayOrderId()));
            } else {
                // 'created', 'pending', 'submitted' -> retain PENDING_CONFIRMATION
                intent.setReconciliationStatus(ReconciliationStatus.PENDING_CONFIRMATION);
                intent.setReconciliationRefundId(razorpayRefundId);
                saveLog(intent, "WEBHOOK_REFUND_STATUS_UPDATE", statusBefore, ReconciliationStatus.PENDING_CONFIRMATION.name(),
                        intent.getRazorpayPaymentId(), razorpayRefundId, intent.getAmount(), "WEBHOOK",
                        "Webhook reported in-flight status: " + razorpayStatus);
            }

            paymentIntentRepository.save(intent);
            return null;
        });
    }

    @Override
    public Page<PaymentReconciliationResponse> getReconciliations(ReconciliationStatus status, Pageable pageable) {
        Page<PaymentIntent> page;
        if (status == null || status == ReconciliationStatus.NONE) {
            page = paymentIntentRepository.findByReconciliationStatusNot(ReconciliationStatus.NONE, pageable);
        } else {
            page = paymentIntentRepository.findByReconciliationStatus(status, pageable);
        }
        return page.map(this::mapToResponse);
    }

    @Override
    public PaymentReconciliationResponse retryReconciliation(Long paymentIntentId, String adminEmail) {
        TransactionTemplate txRequiresNew = new TransactionTemplate(transactionManager);
        txRequiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        // Claim lease with manual admin token
        LeaseClaim claim = txRequiresNew.execute(status -> {
            PaymentIntent intent = paymentIntentRepository.findByIdForUpdate(paymentIntentId)
                    .orElseThrow(() -> new ResourceNotFoundException("PaymentIntent not found with id: " + paymentIntentId));

            if (intent.getReconciliationStatus() == ReconciliationStatus.REFUNDED
                    || intent.getReconciliationStatus() == ReconciliationStatus.EXEMPT_ORDER_FOUND
                    || intent.getReconciliationStatus() == ReconciliationStatus.MANUALLY_RESOLVED) {
                throw new BadRequestException("Cannot retry reconciliation for intent in terminal status: "
                        + intent.getReconciliationStatus());
            }

            String paymentId = resolvePaymentId(intent);
            if (paymentId == null) {
                throw new BadRequestException("No captured payment reference found on PaymentIntent #" + paymentIntentId);
            }

            String leaseToken = UUID.randomUUID().toString();
            String statusBefore = intent.getReconciliationStatus().name();

            intent.setReconciliationStatus(ReconciliationStatus.PROCESSING);
            intent.setReconciliationLeaseToken(leaseToken);
            intent.setReconciliationLeaseExpiresAt(LocalDateTime.now().plusMinutes(leaseDurationMinutes));
            intent.setReconciliationLastAttemptAt(LocalDateTime.now());
            intent.setRazorpayPaymentId(paymentId);
            paymentIntentRepository.save(intent);

            saveLog(intent, "ADMIN_RETRY_INITIATED", statusBefore, ReconciliationStatus.PROCESSING.name(),
                    paymentId, intent.getReconciliationRefundId(), intent.getAmount(),
                    "ADMIN:" + adminEmail, "Manual retry initiated by administrator.");

            return LeaseClaim.builder()
                    .claimed(true)
                    .leaseToken(leaseToken)
                    .paymentId(paymentId)
                    .amount(intent.getAmount())
                    .build();
        });

        if (claim == null) {
            throw new BadRequestException("Failed to claim lease for retry.");
        }

        // Execute external gateway call outside transaction
        GatewayReconciliationOutcome outcome = evaluateGatewayRefund(claim.getPaymentId(), claim.getAmount());

        // Settle outcome
        txRequiresNew.execute(status -> {
            settleOutcomeInTx(paymentIntentId, claim.getLeaseToken(), outcome, claim.getPaymentId(), claim.getAmount(), "ADMIN:" + adminEmail);
            return null;
        });

        PaymentIntent finalIntent = paymentIntentRepository.findById(paymentIntentId).orElseThrow();
        return mapToResponse(finalIntent);
    }

    @Override
    public PaymentReconciliationResponse manualResolve(Long paymentIntentId, AdminManualResolveRequest request, String adminEmail) {
        TransactionTemplate txRequiresNew = new TransactionTemplate(transactionManager);
        txRequiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        PaymentIntent resolved = txRequiresNew.execute(status -> {
            PaymentIntent intent = paymentIntentRepository.findByIdForUpdate(paymentIntentId)
                    .orElseThrow(() -> new ResourceNotFoundException("PaymentIntent not found with id: " + paymentIntentId));

            if (intent.getReconciliationStatus() == ReconciliationStatus.REFUNDED
                    || intent.getReconciliationStatus() == ReconciliationStatus.EXEMPT_ORDER_FOUND
                    || intent.getReconciliationStatus() == ReconciliationStatus.MANUALLY_RESOLVED) {
                throw new BadRequestException("Cannot manually resolve intent already in terminal status: "
                        + intent.getReconciliationStatus());
            }

            // Enforce exact amount match — no silent overrides
            if (request.getSettledAmount().compareTo(intent.getAmount()) != 0) {
                throw new BadRequestException(String.format(
                        "Settled amount ₹%s does not match the exact captured amount ₹%s. Financial discrepancies require separate auditing.",
                        request.getSettledAmount(), intent.getAmount()));
            }

            String statusBefore = intent.getReconciliationStatus().name();
            intent.setReconciliationStatus(ReconciliationStatus.MANUALLY_RESOLVED);
            intent.setReconciliationRefundId(request.getGatewayReference());
            intent.setReconciliationResolvedAt(LocalDateTime.now());
            intent.setReconciliationFailureReason(null);
            intent.setReconciliationLeaseToken(null);
            intent.setReconciliationLeaseExpiresAt(null);

            String auditDetails = String.format("Gateway Ref: %s | Amount: %s %s | Notes: %s | Evidence: %s",
                    request.getGatewayReference(), request.getSettledAmount(), request.getCurrency(),
                    request.getAuditNotes(), request.getSupportingEvidenceOrReason());

            saveLog(intent, "MANUAL_RESOLUTION", statusBefore, ReconciliationStatus.MANUALLY_RESOLVED.name(),
                    intent.getRazorpayPaymentId(), request.getGatewayReference(), intent.getAmount(),
                    "ADMIN:" + adminEmail, auditDetails);

            return paymentIntentRepository.save(intent);
        });

        createAdminNotification("PAYMENT_MANUALLY_RESOLVED",
                String.format("Admin %s marked PaymentIntent #%d as MANUALLY_RESOLVED. Ref: %s.",
                        adminEmail, paymentIntentId, request.getGatewayReference()));

        return mapToResponse(resolved);
    }

    private void saveLog(PaymentIntent intent, String action, String statusBefore, String statusAfter,
                         String paymentId, String refundId, BigDecimal amount, String actor, String details) {
        PaymentReconciliationLog logEntry = PaymentReconciliationLog.builder()
                .paymentIntent(intent)
                .action(action)
                .statusBefore(statusBefore)
                .statusAfter(statusAfter)
                .paymentId(paymentId)
                .refundId(refundId)
                .amount(amount)
                .actor(actor)
                .details(details)
                .createdAt(LocalDateTime.now())
                .build();
        reconciliationLogRepository.save(logEntry);
    }

    private void sendCustomerRefundEmail(PaymentIntent intent, String refundId, BigDecimal amount) {
        String email = intent.getUser() != null ? intent.getUser().getEmail() : null;
        String name = intent.getUser() != null ? (intent.getUser().getFirstName() + " " + intent.getUser().getLastName()) : "Customer";
        if (email != null && !email.isBlank()) {
            emailService.sendRefundSuccessfulEmail(new RefundSuccessfulEmailData(
                    email,
                    name,
                    intent.getRazorpayOrderId(),
                    amount,
                    refundId,
                    LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"))
            ));
        }
    }

    private void sendAdminStuckAlert(PaymentIntent intent, String paymentId, BigDecimal amount) {
        if (!intent.isStuckAlerted()) {
            String customerEmail = intent.getUser() != null ? intent.getUser().getEmail() : "Guest";
            emailService.sendAdminStuckCheckoutEmail(new AdminStuckCheckoutEmailData(
                    paymentId,
                    intent.getRazorpayOrderId(),
                    customerEmail,
                    amount
            ));
            paymentIntentRepository.markStuckAlerted(intent.getId());
        }
    }

    private void createAdminNotification(String type, String message) {
        AdminNotification notification = AdminNotification.builder()
                .type(type)
                .message(message)
                .isRead(false)
                .build();
        adminNotificationRepository.save(notification);
    }

    private PaymentReconciliationResponse mapToResponse(PaymentIntent intent) {
        List<PaymentReconciliationLogResponse> logs = reconciliationLogRepository
                .findByPaymentIntentIdOrderByCreatedAtDesc(intent.getId()).stream()
                .map(l -> PaymentReconciliationLogResponse.builder()
                        .id(l.getId())
                        .action(l.getAction())
                        .statusBefore(l.getStatusBefore())
                        .statusAfter(l.getStatusAfter())
                        .paymentId(l.getPaymentId())
                        .refundId(l.getRefundId())
                        .amount(l.getAmount())
                        .actor(l.getActor())
                        .details(l.getDetails())
                        .createdAt(l.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        String customerEmail = intent.getUser() != null ? intent.getUser().getEmail() : null;
        String customerName = intent.getUser() != null ? (intent.getUser().getFirstName() + " " + intent.getUser().getLastName()) : null;

        return PaymentReconciliationResponse.builder()
                .id(intent.getId())
                .razorpayOrderId(intent.getRazorpayOrderId())
                .razorpayPaymentId(intent.getRazorpayPaymentId())
                .amount(intent.getAmount())
                .consumed(intent.isConsumed())
                .customerEmail(customerEmail)
                .customerName(customerName)
                .reconciliationStatus(intent.getReconciliationStatus())
                .reconciliationRefundId(intent.getReconciliationRefundId())
                .reconciliationFailureReason(intent.getReconciliationFailureReason())
                .reconciliationAttempts(intent.getReconciliationAttempts())
                .reconciliationLeaseExpiresAt(intent.getReconciliationLeaseExpiresAt())
                .reconciliationLastAttemptAt(intent.getReconciliationLastAttemptAt())
                .reconciliationResolvedAt(intent.getReconciliationResolvedAt())
                .createdAt(intent.getCreatedAt())
                .logs(logs)
                .build();
    }

    @lombok.Data
    @lombok.Builder
    private static class LeaseClaim {
        private boolean claimed;
        private String leaseToken;
        private String paymentId;
        private BigDecimal amount;
    }

    private enum GatewayAction {
        ADOPT_PROCESSED,
        ADOPT_PENDING,
        REFUND_PROCESSED,
        REFUND_PENDING,
        TIMEOUT_PENDING,
        FAILED
    }

    @lombok.Data
    @lombok.Builder
    private static class GatewayReconciliationOutcome {
        private GatewayAction action;
        private String refundId;
        private String details;
    }
}
