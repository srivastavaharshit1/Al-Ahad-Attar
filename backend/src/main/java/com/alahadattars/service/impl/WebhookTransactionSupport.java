package com.alahadattars.service.impl;

import com.alahadattars.entity.WebhookEvent;
import com.alahadattars.enums.PaymentStatus;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.WebhookEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Owns the transactional phases of webhook event processing.
 *
 * Extracted into its own Spring bean for exactly the same reason as
 * {@link RefundTransactionSupport}: {@code @Transactional} only takes effect on calls that go
 * through the Spring proxy. When {@code PaymentServiceImpl.handleWebhookEvent} called
 * {@code this.handlePaymentCaptured()} directly, the {@code @Transactional} annotation on the
 * target method was silently ignored — the pessimistic lock executed without a transaction boundary,
 * acquiring and immediately releasing the row lock and providing zero concurrency protection.
 *
 * By moving the transactional logic here, every call from {@code PaymentServiceImpl} goes through
 * Spring's proxy, guaranteeing that the {@code PESSIMISTIC_WRITE} lock on the PaymentIntent row is
 * held for the full duration of the transaction and released only on commit.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebhookTransactionSupport {

    private final PaymentIntentRepository paymentIntentRepository;
    private final WebhookEventRepository webhookEventRepository;
    private final OrderRepository orderRepository;

    /**
     * Processes a {@code payment.captured} webhook event inside a real transaction.
     *
     * <ol>
     *   <li>Acquires a {@code PESSIMISTIC_WRITE} lock on the PaymentIntent row, serializing this
     *       operation against {@code OrderServiceImpl.createOrder} (which acquires the same lock).</li>
     *   <li>Checks idempotency — if the event was already processed, returns immediately.</li>
     *   <li>Persists the {@link WebhookEvent}.</li>
     *   <li>If a local Order already exists for this payment, updates it to {@code PAID}.</li>
     *   <li>If no Order exists yet, the event record is left for {@code createOrder} to discover
     *       (it checks {@code webhookEventRepository.findByPaymentIdAndEventType} while still
     *       holding the same lock).</li>
     * </ol>
     *
     * The lock is released when this method's transaction commits.
     */
    @Transactional
    public void handlePaymentCaptured(String eventId, String eventType, JSONObject payload) {
        JSONObject paymentEntity = payload.optJSONObject("payment") != null
                ? payload.getJSONObject("payment").optJSONObject("entity") : null;
        if (paymentEntity == null) {
            log.warn("Razorpay 'payment.captured' webhook had no payment.entity — ignoring.");
            return;
        }
        String razorpayOrderId = paymentEntity.optString("order_id", null);
        String razorpayPaymentId = paymentEntity.optString("id", null);
        if (razorpayOrderId == null || razorpayPaymentId == null) {
            log.warn("Razorpay 'payment.captured' webhook missing order_id/payment id — ignoring.");
            return;
        }

        // 1. Lock PaymentIntent to serialize with createOrder and any concurrent webhooks.
        var intentOpt = paymentIntentRepository.findByRazorpayOrderIdForUpdate(razorpayOrderId);
        if (intentOpt.isEmpty()) {
            log.warn("Razorpay 'payment.captured' for payment {} (order {}) has no matching PaymentIntent. Proceeding to record event anyway.", razorpayPaymentId, razorpayOrderId);
        }

        // 2. Safe idempotency check now that we are serialized via the lock (or if no intent, standard constraint fallback).
        if (webhookEventRepository.existsById(eventId)) {
            log.info("Duplicate Razorpay webhook event received: {}. Ignoring.", eventId);
            return;
        }

        // 3. Store event
        WebhookEvent webhookEvent = WebhookEvent.builder()
                .eventId(eventId)
                .eventType(eventType)
                .paymentId(razorpayPaymentId)
                .orderId(razorpayOrderId)
                .receivedAt(java.time.LocalDateTime.now())
                .build();
        webhookEventRepository.saveAndFlush(webhookEvent);

        // 4. Look up Order that might have just been created and committed before we got the lock.
        var localOrderOpt = orderRepository.findByTransactionId(razorpayPaymentId);
        if (localOrderOpt.isPresent()) {
            var localOrder = localOrderOpt.get();
            if (localOrder.getPaymentStatus() == PaymentStatus.PENDING) {
                localOrder.setPaymentStatus(PaymentStatus.PAID);
                orderRepository.save(localOrder);
                log.info("Webhook updated existing order {} (payment {}) to PAID.", localOrder.getId(), razorpayPaymentId);
            } else {
                log.info("Razorpay 'payment.captured' for payment {} already processed (status: {}).", razorpayPaymentId, localOrder.getPaymentStatus());
            }
        } else {
            log.info("Webhook received payment.captured for payment {} before order creation. Event saved.", razorpayPaymentId);
        }
    }

    /**
     * Processes a {@code payment.failed} webhook event inside a real transaction.
     * Same locking/idempotency pattern as {@link #handlePaymentCaptured}.
     */
    @Transactional
    public void handlePaymentFailed(String eventId, String eventType, JSONObject payload) {
        JSONObject paymentEntity = payload.optJSONObject("payment") != null
                ? payload.getJSONObject("payment").optJSONObject("entity") : null;
        if (paymentEntity == null) return;

        String razorpayOrderId = paymentEntity.optString("order_id", null);
        String razorpayPaymentId = paymentEntity.optString("id", null);
        if (razorpayOrderId == null || razorpayPaymentId == null) return;

        // 1. Lock PaymentIntent
        var intentOpt = paymentIntentRepository.findByRazorpayOrderIdForUpdate(razorpayOrderId);

        // 2. Idempotency check
        if (webhookEventRepository.existsById(eventId)) {
            log.info("Duplicate Razorpay webhook event received: {}. Ignoring.", eventId);
            return;
        }

        WebhookEvent webhookEvent = WebhookEvent.builder()
                .eventId(eventId)
                .eventType(eventType)
                .paymentId(razorpayPaymentId)
                .orderId(razorpayOrderId)
                .receivedAt(java.time.LocalDateTime.now())
                .build();
        webhookEventRepository.saveAndFlush(webhookEvent);

        var localOrderOpt = orderRepository.findByTransactionId(razorpayPaymentId);
        if (localOrderOpt.isPresent()) {
            var localOrder = localOrderOpt.get();
            if (localOrder.getPaymentStatus() == PaymentStatus.PENDING) {
                localOrder.setPaymentStatus(PaymentStatus.FAILED);
                orderRepository.save(localOrder);
                log.info("Webhook updated order {} (payment {}) to FAILED.", localOrder.getId(), razorpayPaymentId);
            }
        }
    }
}
