package com.alahadattars.service.impl;

import com.alahadattars.dto.payment.PaymentOrderRequest;
import com.alahadattars.dto.payment.PaymentResponse;
import com.alahadattars.dto.payment.PaymentVerificationRequest;
import com.alahadattars.dto.payment.RefundResult;
import com.alahadattars.service.PaymentService;
import com.razorpay.Order;
import com.razorpay.Refund;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import org.json.JSONObject;
import com.alahadattars.service.CartService;
import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.service.StoreSettingsService;
import com.alahadattars.entity.StoreSettings;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.math.BigDecimal;
import jakarta.annotation.PostConstruct;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.repository.WebhookEventRepository;
import com.alahadattars.entity.WebhookEvent;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.enums.PaymentStatus;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.exception.ResourceNotFoundException;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    @Value("${razorpay.webhook.secret:}")
    private String webhookSecret;

    // Bypasses real Razorpay API calls so checkout can be exercised without real merchant keys —
    // set PAYMENT_DEV_MODE=true locally. Never intended for production; validateRazorpayConfig
    // below refuses to boot if this is on alongside a "prod" active profile.
    @Value("${app.payment.dev-mode:false}")
    private boolean devMode;

    @Value("${spring.profiles.active:}")
    private String activeProfile;

    private static final String DEV_ORDER_PREFIX = "order_dev_";

    private final CartService cartService;
    private final StoreSettingsService storeSettingsService;
    private final ProductVariantRepository productVariantRepository;
    private final PaymentIntentRepository paymentIntentRepository;
    private final UserRepository userRepository;
    private final com.alahadattars.repository.OrderRepository orderRepository;
    private final WebhookEventRepository webhookEventRepository;
    private final RefundTransactionSupport refundTransactionSupport;
    private final com.alahadattars.service.EmailService emailService;
    private final WebhookTransactionSupport webhookTransactionSupport;

    @PostConstruct
    public void validateRazorpayConfig() {
        if (devMode && activeProfile != null && activeProfile.toLowerCase().contains("prod")) {
            throw new IllegalStateException("app.payment.dev-mode (PAYMENT_DEV_MODE) is enabled while the 'prod' "
                    + "profile is active. This bypasses real payment collection and signature verification — "
                    + "refusing to start. Unset PAYMENT_DEV_MODE in production.");
        }
        if (devMode) {
            log.warn("PAYMENT DEV MODE ENABLED — Razorpay calls are bypassed and all checkouts are simulated as "
                    + "successful. Set PAYMENT_DEV_MODE=false (or unset it) once real Razorpay keys are configured.");
        }

        if (keyId == null || keyId.trim().isEmpty() || !keyId.startsWith("rzp_")) {
            log.error("CRITICAL: Razorpay Key ID is missing or invalid.");
            throw new IllegalStateException("Invalid Razorpay Key ID. Please configure RAZORPAY_KEY_ID environment variable.");
        }
        
        if (keySecret == null || keySecret.trim().isEmpty() || keySecret.length() < 10) {
            log.error("CRITICAL: Razorpay Key Secret is missing or invalid.");
            throw new IllegalStateException("Invalid Razorpay Key Secret. Please configure RAZORPAY_KEY_SECRET environment variable.");
        }
        
        String maskedKey = keyId.length() > 10 
            ? keyId.substring(0, 9) + "*".repeat(keyId.length() - 9)
            : "*****";
            
        log.info("Razorpay Client initialized successfully with Key ID: {}", maskedKey);
    }

    @Override
    public PaymentResponse createPaymentOrder(String email, PaymentOrderRequest request) {
        try {
            CartResponse cart = cartService.getCart(email);
            
            if (cart == null || cart.getItems().isEmpty()) {
                throw new IllegalStateException("Cart is empty");
            }

            // CRITICAL: Prevent initializing payment for out-of-stock items
            for (com.alahadattars.dto.cart.CartItemResponse item : cart.getItems()) {
                ProductVariant variant = productVariantRepository.findById(item.getVariantId()).orElse(null);
                if (variant != null && variant.getStock() < item.getQuantity()) {
                    throw new IllegalStateException("Insufficient stock for " + variant.getProduct().getName() + ". Available: " + variant.getStock());
                }
            }
            
            StoreSettings settings = storeSettingsService.getSettingsEntity();
            BigDecimal threshold = settings.getFreeShippingThreshold() != null ? settings.getFreeShippingThreshold() : new BigDecimal("500");
            BigDecimal charge = settings.getShippingCharge() != null ? settings.getShippingCharge() : new BigDecimal("50");
            
            BigDecimal subtotalAfterItemDiscounts = cart.getSubtotal().subtract(cart.getItemDiscounts());
            BigDecimal shippingCost = subtotalAfterItemDiscounts.compareTo(threshold) >= 0 ? BigDecimal.ZERO : charge;
            
            if (cart.getAppliedPromotions().stream().anyMatch(p -> (p.getName() != null && p.getName().contains("Free Shipping")) || (p.getDescription() != null && p.getDescription().contains("Free Shipping")))) {
                shippingCost = BigDecimal.ZERO;
            }
            
            BigDecimal secureTotalAmount = cart.getTotal().add(shippingCost);
            
            // Include gift service price if selected
            Boolean isGiftWrapped = request.getIsGiftWrapped() != null ? request.getIsGiftWrapped() : false;
            if (isGiftWrapped && settings.getIsGiftWrapEnabled()) {
                secureTotalAmount = secureTotalAmount.add(settings.getGiftWrapPrice() != null ? settings.getGiftWrapPrice() : BigDecimal.ZERO);
            }
            
            String razorpayOrderId;
            String orderStatus;

            if (devMode) {
                // No real Razorpay order — nothing to authenticate against, so fabricate an id in the
                // same shape Razorpay uses. verifyPayment() recognises the DEV_ORDER_PREFIX and skips
                // real signature verification for it.
                razorpayOrderId = DEV_ORDER_PREFIX + java.util.UUID.randomUUID().toString().replace("-", "");
                orderStatus = "created";
                log.info("[dev-mode] Simulated Razorpay order {} for {} (amount {})", razorpayOrderId, email, secureTotalAmount);
            } else {
                RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);

                JSONObject orderRequest = new JSONObject();
                // amount in paise
                orderRequest.put("amount", secureTotalAmount.multiply(new BigDecimal("100")).intValue());
                orderRequest.put("currency", request.getCurrency() != null ? request.getCurrency() : "INR");
                orderRequest.put("receipt", request.getReceipt());

                // No custom order number yet, generated during actual checkout
                JSONObject notes = new JSONObject();
                notes.put("email", email);
                orderRequest.put("notes", notes);

                Order order = razorpay.orders.create(orderRequest);
                razorpayOrderId = order.get("id");
                orderStatus = order.get("status");
            }

            // Record what we asked Razorpay to collect, and for whom. Checkout reconciles the order it is
            // about to create against this row — without it, a valid signature would authorise any basket.
            com.alahadattars.entity.User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));

            paymentIntentRepository.save(PaymentIntent.builder()
                    .razorpayOrderId(razorpayOrderId)
                    .user(user)
                    .amount(secureTotalAmount)
                    .consumed(false)
                    .build());

            return PaymentResponse.builder()
                    .razorpayOrderId(razorpayOrderId)
                    .status(orderStatus)
                    .message(devMode ? "Payment order created successfully (dev mode — no real charge)" : "Payment order created successfully")
                    .devMode(devMode)
                    .build();
                    
        } catch (RazorpayException e) {
            throw new RuntimeException("Error creating Razorpay order: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean verifyPayment(PaymentVerificationRequest request) {
        if (devMode && request.getRazorpayOrderId() != null && request.getRazorpayOrderId().startsWith(DEV_ORDER_PREFIX)) {
            log.info("[dev-mode] Skipping real signature verification for simulated order {}", request.getRazorpayOrderId());
            return true;
        }
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", request.getRazorpayOrderId());
            options.put("razorpay_payment_id", request.getRazorpayPaymentId());
            options.put("razorpay_signature", request.getRazorpaySignature());
            
            return Utils.verifyPaymentSignature(options, keySecret);
        } catch (RazorpayException e) {
            log.error("Razorpay signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public RefundResult initiateRefund(String razorpayPaymentId, BigDecimal amount) {
        try {
            if (razorpayPaymentId == null || razorpayPaymentId.isBlank()) {
                return RefundResult.builder()
                        .success(false)
                        .errorMessage("No Razorpay payment ID found on this order. Cannot process refund.")
                        .build();
            }

            if (devMode) {
                // Orders placed in dev mode never had a real Razorpay payment behind them (see
                // createPaymentOrder), so there's nothing for the real API to refund — every dev-mode
                // order's transactionId looks like pay_dev_... from Checkout.tsx. Calling Razorpay for
                // one always fails (payment doesn't exist there), which is exactly what surfaced this.
                String refundId = "rfnd_dev_" + java.util.UUID.randomUUID().toString().replace("-", "");
                log.info("[dev-mode] Simulated refund {} for payment {} (amount {})", refundId, razorpayPaymentId, amount);
                return RefundResult.builder().success(true).refundId(refundId).build();
            }

            // This SDK version has no idempotency-key support on the refund call, so a lost
            // response (e.g. a timeout after Razorpay already processed the refund) followed by
            // an admin/system retry would otherwise send a second, genuine refund request — a
            // real double-refund at Razorpay, not just a duplicate row in our own DB. Check
            // Razorpay's own record for this payment first; if a non-failed refund for this exact
            // amount already exists there, treat it as already-completed instead of refunding again.
            Optional<RefundResult> existing = checkExistingRefund(razorpayPaymentId, amount);
            if (existing.isPresent() && existing.get().isSuccess()) {
                log.warn("Found existing Razorpay refund for payment {} matching amount {} — skipping duplicate "
                        + "refund request (likely a retry after a lost response).", razorpayPaymentId, amount);
                return existing.get();
            }

            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
            int amountInPaise = amount.multiply(new BigDecimal("100")).intValue();

            JSONObject refundRequest = new JSONObject();
            // Razorpay expects amount in paise (1 INR = 100 paise)
            refundRequest.put("amount", amountInPaise);
            refundRequest.put("speed", "normal"); // 'normal' or 'optimum'

            log.info("Initiating Razorpay refund for payment: {} | Amount: {} INR ({} paise)",
                    razorpayPaymentId, amount, amountInPaise);

            Refund refund = razorpay.payments.refund(razorpayPaymentId, refundRequest);
            String refundId = refund.get("id");

            log.info("Razorpay refund successful. Refund ID: {}", refundId);

            return RefundResult.builder()
                    .success(true)
                    .refundId(refundId)
                    .build();

        } catch (RazorpayException e) {
            log.error("Razorpay refund API failed for payment {}: {}", razorpayPaymentId, e.getMessage());
            return RefundResult.builder()
                    .success(false)
                    .errorMessage("Razorpay error: " + e.getMessage())
                    .build();
        } catch (Exception e) {
            log.error("Unexpected error during refund for payment {}: {}", razorpayPaymentId, e.getMessage());
            return RefundResult.builder()
                    .success(false)
                    .errorMessage("Unexpected error: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Optional<RefundResult> checkExistingRefund(String razorpayPaymentId, BigDecimal amount) {
        if (razorpayPaymentId == null || razorpayPaymentId.isBlank()) {
            return Optional.empty();
        }
        if (devMode) {
            // Dev-mode payments never had a real Razorpay payment behind them — nothing to
            // reconcile against. Treat as "unknown" so callers don't misreport a definitive
            // outcome for something that was never real to begin with.
            return Optional.empty();
        }
        try {
            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
            int amountInPaise = amount.multiply(new BigDecimal("100")).intValue();
            for (Refund existing : razorpay.payments.fetchAllRefunds(razorpayPaymentId)) {
                Integer existingAmount = existing.get("amount");
                if (existingAmount == null || existingAmount != amountInPaise) {
                    continue;
                }
                String status = existing.get("status");
                String refundId = existing.get("id");
                if (status != null && status.equalsIgnoreCase("failed")) {
                    return Optional.of(RefundResult.builder().success(false)
                            .errorMessage("Razorpay reports this refund failed.").build());
                }
                return Optional.of(RefundResult.builder().success(true).refundId(refundId).build());
            }
        } catch (Exception e) {
            // A failed lookup means the outcome is genuinely unknown, not "no refund exists" — the
            // caller must treat this exactly like "not found" (empty), never as a green light to
            // call Razorpay again without further reconciliation.
            log.warn("Could not check existing Razorpay refunds for payment {}: {}", razorpayPaymentId, e.getMessage());
        }
        return Optional.empty();
    }

    @Override
    public boolean handleWebhookEvent(String rawPayload, String signature) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.error("Rejected Razorpay webhook call: RAZORPAY_WEBHOOK_SECRET is not configured.");
            return false;
        }
        try {
            if (!Utils.verifyWebhookSignature(rawPayload, signature, webhookSecret)) {
                log.warn("Rejected Razorpay webhook call: signature verification failed.");
                return false;
            }
        } catch (RazorpayException e) {
            log.warn("Rejected Razorpay webhook call: signature verification error: {}", e.getMessage());
            return false;
        }

        JSONObject body = new JSONObject(rawPayload);
        String event = body.optString("event", "");
        String eventId = body.optString("id", null);
        JSONObject payload = body.optJSONObject("payload");
        
        if (payload == null || eventId == null) {
            log.warn("Razorpay webhook event '{}' had no payload or event ID — ignoring.", event);
            return true;
        }

        switch (event) {
            case "payment.captured" -> webhookTransactionSupport.handlePaymentCaptured(eventId, event, payload);
            case "payment.failed" -> webhookTransactionSupport.handlePaymentFailed(eventId, event, payload);
            case "refund.processed", "refund.failed" -> handleRefundEvent(eventId, event, payload);
            default -> log.info("Received Razorpay webhook event '{}' — no handler wired for it, ignoring.", event);
        }
        return true;
    }

    // handlePaymentCaptured and handlePaymentFailed have been moved to WebhookTransactionSupport.
    // They were previously defined as protected methods here, but @Transactional on a self-invoked
    // method is silently ignored by Spring's proxy — the pessimistic lock was executing without a
    // transaction, providing zero concurrency protection. See WebhookTransactionSupport's Javadoc.

    /**
     * The independent async source of truth for refund outcomes — closes the gap where an
     * admin-initiated refund reaches Razorpay but the local DB update after the blocking HTTP call
     * never happens (app crash, network timeout on the response). Delegates the actual DB write to
     * {@link RefundTransactionSupport} (a separate Spring bean, correctly proxied for
     * {@code @Transactional} — see its own Javadoc for why a private/self-invoked method here
     * would silently NOT run in a transaction).
     */
    private void handleRefundEvent(String eventId, String event, JSONObject payload) {
        JSONObject refundEntity = payload.optJSONObject("refund") != null
                ? payload.getJSONObject("refund").optJSONObject("entity") : null;
        if (refundEntity == null) {
            log.warn("Razorpay '{}' webhook had no refund.entity — ignoring.", event);
            return;
        }
        String razorpayRefundId = refundEntity.optString("id", null);
        String paymentId = refundEntity.optString("payment_id", null);
        String status = refundEntity.optString("status", null);
        log.info("Razorpay webhook '{}': refund {} for payment {}, status={}", event, razorpayRefundId, paymentId, status);

        if (razorpayRefundId == null) {
            return;
        }

        // Simple idempotency check (we don't lock here as refund handling is largely idempotent via refundTransactionSupport anyway)
        if (webhookEventRepository.existsById(eventId)) {
            log.info("Duplicate Razorpay webhook refund event received: {}. Ignoring.", eventId);
            return;
        }

        WebhookEvent webhookEvent = WebhookEvent.builder()
                .eventId(eventId)
                .eventType(event)
                .paymentId(paymentId)
                .receivedAt(java.time.LocalDateTime.now())
                .build();
        // Since handleRefundEvent is NOT transactional, this save acts locally.
        // It's acceptable if concurrent duplicates race and fail on constraint violation here.
        webhookEventRepository.saveAndFlush(webhookEvent);

        refundTransactionSupport.reconcileRefundFromWebhook(razorpayRefundId, paymentId, status);
    }
}
