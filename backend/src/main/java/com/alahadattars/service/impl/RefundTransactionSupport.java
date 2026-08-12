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
class RefundTransactionSupport {

    private final OrderRepository orderRepository;
    private final RefundRepository refundRepository;
    private final ProductVariantRepository variantRepository;

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
    record AdminRefundPreparation(Order order, BigDecimal refundAmount, LocalDateTime initiatedAt) {
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
        orderRepository.save(order);

        return new AdminRefundPreparation(order, refundAmount, initiatedAt);
    }

    @Transactional
    public Order recordAdminRefundOutcome(Order order, RefundResult result, BigDecimal refundAmount, LocalDateTime initiatedAt) {
        if (result.isSuccess()) {
            LocalDateTime completedAt = LocalDateTime.now();
            order.setRefundStatus(RefundStatus.REFUNDED);
            order.setRefundId(result.getRefundId());
            order.setRefundCompletedAt(completedAt);
            order.setRefundFailureReason(null);
            log.info("Refund REFUNDED for order {} | Refund ID: {}", order.getId(), result.getRefundId());
            saveRefundRecord(order, result.getRefundId(), refundAmount, RefundStatus.REFUNDED, null, initiatedAt, completedAt);
        } else {
            order.setRefundStatus(RefundStatus.FAILED);
            order.setRefundFailureReason(result.getErrorMessage());
            log.error("Refund FAILED for order {} | Error: {}", order.getId(), result.getErrorMessage());
            saveRefundRecord(order, null, refundAmount, RefundStatus.FAILED, result.getErrorMessage(), initiatedAt, null);
        }
        Order saved = orderRepository.save(order);
        initializeForResponse(saved);
        return saved;
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
                        : orderRepository.findByTransactionIdAndRefundStatus(paymentId, RefundStatus.PROCESSING))
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

        // The claim/PROCESSING phase (claimAdminRefundProcessing) never creates a Refund audit
        // row — only recordAdminRefundOutcome does, after the blocking Razorpay call returns. If
        // that never ran, this webhook is the first place a row for this attempt gets written.
        saveRefundRecord(order, processed ? razorpayRefundId : null, order.getRefundAmount(), order.getRefundStatus(),
                order.getRefundFailureReason(), order.getRefundInitiatedAt(), processed ? now : null);

        log.info("Reconciled order {} refund to {} via webhook (refund {}).", order.getId(), order.getRefundStatus(), razorpayRefundId);
    }

    private void restoreInventory(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getVariant() != null) {
                ProductVariant variant = item.getVariant();
                variantRepository.incrementStock(variant.getId(), item.getQuantity());
                log.info("Inventory restored for variant {} (+{})", variant.getId(), item.getQuantity());
            }
        }
    }

    private Refund saveRefundRecord(Order order, String razorpayRefundId, BigDecimal amount, RefundStatus status,
                                     String failureReason, LocalDateTime initiatedAt, LocalDateTime completedAt) {
        Refund refund = Refund.builder()
                .order(order)
                .paymentId(order.getTransactionId())
                .razorpayRefundId(razorpayRefundId)
                .amount(amount)
                .status(status)
                .failureReason(failureReason)
                .initiatedAt(initiatedAt)
                .completedAt(completedAt)
                .build();
        return refundRepository.save(refund);
    }
}
