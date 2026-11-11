package com.alahadattars.service.impl;

import com.alahadattars.dto.payment.RefundResult;
import com.alahadattars.entity.Order;
import com.alahadattars.entity.OrderItem;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Refund;
import com.alahadattars.enums.OrderStatus;
import com.alahadattars.enums.PaymentStatus;
import com.alahadattars.enums.RefundStatus;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.RefundRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Owns every DB-only phase of the cancel/refund flow as its own short-lived transaction, so the
 * blocking Razorpay HTTP call sandwiched between them never holds a pooled JDBC connection.
 * Extracted into its own Spring bean because {@code @Transactional} only takes effect on calls
 * that go through the Spring proxy — a private method invoked via {@code this.} inside
 * OrderServiceImpl would silently run inside whatever transaction (or lack of one) the caller
 * already has, which is exactly what previously let a single {@code @Transactional} method hold
 * a connection for the full duration of the external Razorpay call.
 *
 * Business rule: cancellation (customer- or admin-initiated) NEVER calls Razorpay itself — it
 * only ever flags a paid order's refund as {@link RefundStatus#REFUND_REQUIRED}. Only the
 * admin-only refund-processing methods below ({@link #claimAdminRefundProcessing}/
 * {@link #recordAdminRefundOutcome}) ever call into Razorpay (from OrderServiceImpl, in between).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RefundTransactionSupport {

    private final OrderRepository orderRepository;
    private final RefundRepository refundRepository;
    private final ProductVariantRepository variantRepository;
    private final com.alahadattars.repository.BottleRepository bottleRepository;
    private final com.alahadattars.repository.OrderItemGiftSetComponentRepository orderItemGiftSetComponentRepository;
    private final com.alahadattars.repository.AdminNotificationRepository adminNotificationRepository;

    /**
     * Customer self-cancellation: only CONFIRMED orders owned by {@code email} may be cancelled.
     * Restores inventory and, for paid orders, flags the refund as REFUND_REQUIRED — never calls
     * Razorpay. Throws BadRequestException with a status-specific reason if the order can't be
     * cancelled, ResourceNotFoundException if it doesn't belong to this customer.
     */
    @Transactional
    public Order claimCancellationAndPrepareRefund(Long orderId, String email) {
        Order order = orderRepository.findByIdAndUserEmail(orderId, email)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        rejectUnlessConfirmed(order);

        if (orderRepository.claimCancellation(orderId) == 0) {
            throw new BadRequestException("This order cannot be cancelled — its status just changed. Please refresh and try again.");
        }

        return finishCancellation(order, email);
    }

    /**
     * Admin-initiated cancellation (e.g. customer support handling a phone request). Enforces the
     * exact same CONFIRMED-only rule and atomic claim as customer self-cancellation — PACKED is
     * the cutoff for every actor, not just customers — but looks the order up by id alone (no
     * ownership restriction) and records {@code adminEmail} as the canceller for the audit trail.
     */
    @Transactional
    public Order claimAdminCancellation(Long orderId, String adminEmail) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        rejectUnlessConfirmed(order);

        if (orderRepository.claimCancellation(orderId) == 0) {
            throw new BadRequestException("This order cannot be cancelled — its status just changed. Please refresh and try again.");
        }

        return finishCancellation(order, adminEmail);
    }

    private void rejectUnlessConfirmed(Order order) {
        OrderStatus currentStatus = order.getStatus();
        if (currentStatus != OrderStatus.CONFIRMED) {
            String reason = switch (currentStatus) {
                case PACKED -> "This order can no longer be cancelled because it has already been packed.";
                case SHIPPED -> "This order can no longer be cancelled because it has already been shipped.";
                case DELIVERED -> "This order can no longer be cancelled because it has already been delivered.";
                case CANCELLED -> "This order has already been cancelled.";
                default -> "This order cannot be cancelled at this stage.";
            };
            throw new BadRequestException(reason);
        }
    }

    /** Shared tail of both cancellation paths, once the atomic CONFIRMED->CANCELLED claim has succeeded. */
    private Order finishCancellation(Order order, String cancelledByEmail) {
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelledBy(cancelledByEmail);
        restoreInventory(order);

        if (order.getPaymentStatus() != PaymentStatus.PAID) {
            order.setRefundStatus(RefundStatus.NOT_REQUIRED);
            log.info("Order {} cancelled by {}. No refund required (payment status: {}).",
                    order.getId(), cancelledByEmail, order.getPaymentStatus());
        } else {
            // Cancellation only ever flags that a refund is needed — it never calls Razorpay
            // itself. A missing transactionId (paid orders always have one from checkout) would
            // simply surface as a clear rejection the moment an admin actually tries to process
            // this refund (see claimAdminRefundProcessing), so there's nothing to pre-judge here.
            order.setRefundStatus(RefundStatus.REFUND_REQUIRED);
            order.setRefundAmount(order.getTotalAmount());
            log.info("Order {} cancelled by {}. Refund REQUIRED for amount {} — awaiting admin action.",
                    order.getId(), cancelledByEmail, order.getTotalAmount());
        }

        Order saved = orderRepository.save(order);
        initializeForResponse(saved);
        return saved;
    }

    /** Outcome of the DB-only guard phase of an admin-initiated refund. */
    public static class AdminRefundPreparation {
        private final Order order;
        private final BigDecimal refundAmount;
        private final LocalDateTime initiatedAt;
        private final Long refundRecordId;
        private final String idempotencyKey;

        public AdminRefundPreparation(Order order, BigDecimal refundAmount, LocalDateTime initiatedAt) {
            this(order, refundAmount, initiatedAt, null, "order-" + (order != null ? order.getOrderNumber() : "UNKNOWN") + "-ref-1");
        }

        public AdminRefundPreparation(Order order, BigDecimal refundAmount, LocalDateTime initiatedAt, Long refundRecordId, String idempotencyKey) {
            this.order = order;
            this.refundAmount = refundAmount;
            this.initiatedAt = initiatedAt;
            this.refundRecordId = refundRecordId;
            this.idempotencyKey = idempotencyKey;
        }

        public Order order() { return order; }
        public BigDecimal refundAmount() { return refundAmount; }
        public LocalDateTime initiatedAt() { return initiatedAt; }
        public Long refundRecordId() { return refundRecordId; }
        public String idempotencyKey() { return idempotencyKey; }
    }

    @Transactional
    public AdminRefundPreparation claimAdminRefundProcessing(Long orderId, String adminEmail) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        if (order.getStatus() != OrderStatus.CANCELLED) {
            throw new BadRequestException("Refund can only be issued for cancelled orders. Current status: " + order.getStatus());
        }
        if (order.getPaymentStatus() != PaymentStatus.PAID) {
            throw new BadRequestException("Refund not applicable. Payment status is: " + order.getPaymentStatus());
        }
        if (order.getRefundStatus() == RefundStatus.REFUNDED) {
            throw new BadRequestException("This refund has already been processed. Refund ID: " + order.getRefundId());
        }
        if (order.getTransactionId() == null || order.getTransactionId().isBlank()) {
            throw new BadRequestException("No Razorpay payment ID found on this order. Cannot process refund.");
        }

        BigDecimal refundAmount = order.getRefundAmount() != null ? order.getRefundAmount() : order.getTotalAmount();

        // Conditionally claim PROCESSING. Returns 0 if another request already claimed it first —
        // that request is rejected before ever calling Razorpay, so the same order cannot be
        // refunded twice concurrently (double-click, two tabs, two admins).
        if (orderRepository.claimRefundProcessing(orderId) == 0) {
            throw new BadRequestException("A refund is already being processed (or has completed) for this order.");
        }

        LocalDateTime initiatedAt = LocalDateTime.now();
        order.setRefundStatus(RefundStatus.PROCESSING);
        order.setRefundInitiatedAt(initiatedAt);
        order.setRefundInitiatedBy(adminEmail);
        order.setRefundAmount(refundAmount);
        order.setRefundFailureReason(null);
        order = orderRepository.save(order);

        // Create an in-flight Refund audit record to represent this specific refund operation.
        // Its auto-generated database ID provides a persistent, globally unique operation identity.
        Refund refund = Refund.builder()
                .order(order)
                .paymentId(order.getTransactionId())
                .amount(refundAmount)
                .status(RefundStatus.PROCESSING)
                .initiatedAt(initiatedAt)
                .build();
        refund = refundRepository.save(refund);

        Long refundId = refund.getId();
        String idempotencyKey = refundId != null
                ? "order-" + order.getOrderNumber() + "-ref-" + refundId
                : "order-" + order.getOrderNumber() + "-ref-0";

        return new AdminRefundPreparation(order, refundAmount, initiatedAt, refundId, idempotencyKey);
    }

    @Transactional
    public Order recordAdminRefundOutcome(Order order, Long refundRecordId, RefundResult result, BigDecimal refundAmount, LocalDateTime initiatedAt) {
        Refund refund = null;
        if (refundRecordId != null) {
            refund = refundRepository.findById(refundRecordId).orElse(null);
        }

        LocalDateTime now = LocalDateTime.now();
        if (result.getOutcome() == RefundResult.RefundOutcome.SUCCESS) {
            order.setRefundStatus(RefundStatus.PROCESSING);
            order.setRefundId(result.getRefundId());
            order.setRefundFailureReason(null);
            log.info("Refund API SUCCESSFUL for order {} | Refund ID: {}. Leaving in PROCESSING state pending webhook.", order.getId(), result.getRefundId());
            updateOrSaveRefundRecord(refund, order, result.getRefundId(), refundAmount, RefundStatus.PROCESSING, null, initiatedAt, null);
        } else if (result.getOutcome() == RefundResult.RefundOutcome.PROCESSED) {
            order.setRefundStatus(RefundStatus.REFUNDED);
            order.setRefundId(result.getRefundId());
            order.setRefundFailureReason(null);
            order.setRefundCompletedAt(now);
            log.info("Refund API returned PROCESSED for order {} | Refund ID: {}. Marking REFUNDED immediately.", order.getId(), result.getRefundId());
            updateOrSaveRefundRecord(refund, order, result.getRefundId(), refundAmount, RefundStatus.REFUNDED, null, initiatedAt, now);
        } else if (result.getOutcome() == RefundResult.RefundOutcome.UNKNOWN_TIMEOUT) {
            order.setRefundStatus(RefundStatus.PROCESSING);
            order.setRefundFailureReason("API timeout or unknown state. Waiting for webhook reconciliation.");
            log.warn("Refund API UNKNOWN/TIMEOUT for order {}. Leaving in PROCESSING state pending webhook.", order.getId());
            updateOrSaveRefundRecord(refund, order, null, refundAmount, RefundStatus.PROCESSING, "API timeout/unknown", initiatedAt, null);
        } else {
            order.setRefundStatus(RefundStatus.FAILED);
            order.setRefundFailureReason(result.getErrorMessage());
            log.error("Refund FAILED definitively for order {} | Error: {}", order.getId(), result.getErrorMessage());
            updateOrSaveRefundRecord(refund, order, null, refundAmount, RefundStatus.FAILED, result.getErrorMessage(), initiatedAt, null);
        }
        Order saved = orderRepository.save(order);
        initializeForResponse(saved);
        return saved;
    }

    @Transactional
    public Order recordAdminRefundOutcome(Order order, RefundResult result, BigDecimal refundAmount, LocalDateTime initiatedAt) {
        return recordAdminRefundOutcome(order, null, result, refundAmount, initiatedAt);
    }

    /**
     * OrderServiceImpl reads order.getUser()/getShippingAddress()/getItems() (and each item's
     * variant/product) — via the cancellation/refund emails and mapToResponse — after these
     * @Transactional methods have returned and their session has closed. All of those
     * associations are LAZY, so an uninitialized proxy would throw LazyInitializationException
     * at that point instead of failing loudly here. Resolve the whole graph now, while the
     * session is still open, rather than only whichever field happened to be hit first.
     */
    private void initializeForResponse(Order order) {
        org.hibernate.Hibernate.initialize(order.getUser());
        org.hibernate.Hibernate.initialize(order.getShippingAddress());
        org.hibernate.Hibernate.initialize(order.getItems());
        for (OrderItem item : order.getItems()) {
            if (item.getVariant() != null) {
                org.hibernate.Hibernate.initialize(item.getVariant());
                org.hibernate.Hibernate.initialize(item.getVariant().getProduct());
                if (item.getVariant().getProduct() != null) {
                    org.hibernate.Hibernate.initialize(item.getVariant().getProduct().getImages());
                }
            }
            if (item.isGiftSet()) {
                if (item.getGiftSetComponents() != null) {
                    org.hibernate.Hibernate.initialize(item.getGiftSetComponents());
                }
            }
        }
    }

    /**
     * The independent async source of truth for refund outcomes, driven by Razorpay's
     * refund.processed/refund.failed webhook — closes the gap where an admin-initiated refund
     * reaches Razorpay but the local DB update after the blocking HTTP call never happens (app
     * crash, network timeout on the response). Naturally idempotent: a refund already in a
     * terminal state (REFUNDED/FAILED) makes this a no-op, so replayed/duplicate webhook
     * deliveries (Razorpay's own retry policy) are safe.
     */
    @Transactional
    public void reconcileRefundFromWebhook(String razorpayRefundId, String paymentId, String razorpayStatus) {
        // Prefer matching by the refund id itself (already reconciled once, e.g. by our own
        // recordAdminRefundOutcome) — falls back to "which order is stuck PROCESSING against this
        // payment" for the case this webhook is the FIRST thing to ever record the outcome.
        Order order = orderRepository.findByRefundId(razorpayRefundId)
                .or(() -> paymentId == null ? java.util.Optional.empty()
                        : orderRepository.findByTransactionId(paymentId))
                .orElse(null);
        if (order == null) {
            log.info("Refund webhook for {} (payment {}) has no matching order to reconcile — already settled or not ours.",
                    razorpayRefundId, paymentId);
            return;
        }
        if (order.getRefundStatus() == RefundStatus.REFUNDED) {
            log.info("Order {} refund already REFUNDED — webhook for {} is a no-op.", order.getId(), razorpayRefundId);
            return;
        }

        boolean processed = "processed".equalsIgnoreCase(razorpayStatus);
        boolean failed = "failed".equalsIgnoreCase(razorpayStatus);
        if (!processed && !failed) {
            log.info("Refund {} webhook status '{}' isn't a terminal state — nothing to reconcile yet.", razorpayRefundId, razorpayStatus);
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        if (processed) {
            order.setRefundStatus(RefundStatus.REFUNDED);
            order.setRefundId(razorpayRefundId);
            order.setRefundCompletedAt(now);
            order.setRefundFailureReason(null);
        } else {
            order.setRefundStatus(RefundStatus.FAILED);
            order.setRefundFailureReason("Razorpay reported this refund failed (webhook reconciliation).");
        }
        orderRepository.save(order);

        // If the blocking call never returned locally, this webhook updates the in-flight
        // PROCESSING Refund record (or creates one if none exists).
        updateOrSaveRefundRecord(null, order, processed ? razorpayRefundId : null, order.getRefundAmount(), order.getRefundStatus(),
                order.getRefundFailureReason(), order.getRefundInitiatedAt(), processed ? now : null);

        log.info("Reconciled order {} refund to {} via webhook (refund {}).", order.getId(), order.getRefundStatus(), razorpayRefundId);
    }

    private void restoreInventory(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.isGiftSet()) {
                List<com.alahadattars.entity.OrderItemGiftSetComponent> components = item.getGiftSetComponents();
                if (components == null || components.isEmpty()) {
                    components = orderItemGiftSetComponentRepository.findByOrderItemId(item.getId());
                }
                if (components != null) {
                    for (com.alahadattars.entity.OrderItemGiftSetComponent comp : components) {
                        int rowsUpdated = variantRepository.incrementStock(comp.getVariantId(), comp.getTotalDeductedQuantity());
                        if (rowsUpdated > 0) {
                            log.info("Inventory restored for gift set component variant {} (+{}) for order {}",
                                    comp.getVariantId(), comp.getTotalDeductedQuantity(), order.getOrderNumber());
                        } else {
                            log.error("Failed to restore inventory for cancelled Order #{}: Component variant ID {} ({} - {}) not found.",
                                    order.getOrderNumber(), comp.getVariantId(), comp.getProductName(), comp.getVariantSize());
                            com.alahadattars.entity.AdminNotification anomaly = com.alahadattars.entity.AdminNotification.builder()
                                    .type("INVENTORY_RESTORATION_ANOMALY")
                                    .orderId(order.getId())
                                    .message(String.format("Failed to restore inventory for cancelled Order #%s: Component variant ID %d (%s - %s) not found in catalog.",
                                            order.getOrderNumber(), comp.getVariantId(), comp.getProductName(), comp.getVariantSize()))
                                    .isRead(false)
                                    .build();
                            adminNotificationRepository.save(anomaly);
                        }
                    }
                }
            } else {
                if (item.getVariant() != null) {
                    ProductVariant variant = item.getVariant();
                    variantRepository.incrementStock(variant.getId(), item.getQuantity());
                    log.info("Inventory restored for variant {} (+{})", variant.getId(), item.getQuantity());
                }
                if (item.getBottleId() != null) {
                    bottleRepository.incrementStock(item.getBottleId(), item.getQuantity());
                    log.info("Inventory restored for bottle {} (+{})", item.getBottleId(), item.getQuantity());
                }
            }
        }
    }

    private Refund updateOrSaveRefundRecord(Refund existingRefund, Order order, String razorpayRefundId, BigDecimal amount,
                                            RefundStatus status, String failureReason, LocalDateTime initiatedAt, LocalDateTime completedAt) {
        Refund refund = existingRefund;
        if (refund == null && razorpayRefundId != null) {
            refund = refundRepository.findByRazorpayRefundId(razorpayRefundId).orElse(null);
        }
        
        if (refund == null) {
            List<Refund> orderRefunds = refundRepository.findByOrderOrderByCreatedAtDesc(order);
            if (!orderRefunds.isEmpty() && orderRefunds.get(0).getStatus() == RefundStatus.PROCESSING) {
                refund = orderRefunds.get(0);
            }
        }
        
        if (refund == null) {
            refund = Refund.builder()
                    .order(order)
                    .paymentId(order.getTransactionId())
                    .razorpayRefundId(razorpayRefundId)
                    .amount(amount)
                    .initiatedAt(initiatedAt)
                    .build();
        }

        if (razorpayRefundId != null) {
            refund.setRazorpayRefundId(razorpayRefundId);
        }
        refund.setStatus(status);
        refund.setFailureReason(failureReason);
        if (completedAt != null && refund.getCompletedAt() == null) {
            refund.setCompletedAt(completedAt);
        }
        
        return refundRepository.save(refund);
    }
}
