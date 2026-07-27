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
import com.alahadattars.repository.GiftServiceRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    private final CartService cartService;
    private final StoreSettingsService storeSettingsService;
    private final ProductVariantRepository productVariantRepository;
    private final GiftServiceRepository giftServiceRepository;

    @PostConstruct
    public void validateRazorpayConfig() {
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
            if (request.getGiftServiceId() != null) {
                com.alahadattars.entity.GiftService giftSvc = giftServiceRepository.findById(request.getGiftServiceId()).orElse(null);
                if (giftSvc != null && giftSvc.isActive()) {
                    secureTotalAmount = secureTotalAmount.add(giftSvc.getPrice());
                }
            }
            
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
            
            return PaymentResponse.builder()
                    .razorpayOrderId(order.get("id"))
                    .status(order.get("status"))
                    .message("Payment order created successfully")
                    .build();
                    
        } catch (RazorpayException e) {
            throw new RuntimeException("Error creating Razorpay order: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean verifyPayment(PaymentVerificationRequest request) {
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", request.getRazorpayOrderId());
            options.put("razorpay_payment_id", request.getRazorpayPaymentId());
            options.put("razorpay_signature", request.getRazorpaySignature());
            
            return Utils.verifyPaymentSignature(options, keySecret);
        } catch (RazorpayException e) {
            System.err.println("Razorpay signature verification failed: " + e.getMessage());
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

            RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);

            JSONObject refundRequest = new JSONObject();
            // Razorpay expects amount in paise (1 INR = 100 paise)
            refundRequest.put("amount", amount.multiply(new BigDecimal("100")).intValue());
            refundRequest.put("speed", "normal"); // 'normal' or 'optimum'

            log.info("Initiating Razorpay refund for payment: {} | Amount: {} INR ({} paise)",
                    razorpayPaymentId, amount, amount.multiply(new BigDecimal("100")).intValue());

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
}
