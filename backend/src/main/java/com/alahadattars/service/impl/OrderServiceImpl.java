package com.alahadattars.service.impl;

import com.alahadattars.dto.order.OrderItemRequest;
import com.alahadattars.dto.order.OrderItemResponse;
import com.alahadattars.dto.order.OrderRequest;
import com.alahadattars.dto.order.OrderResponse;
import com.alahadattars.dto.profile.AddressResponse;
import com.alahadattars.entity.Address;
import com.alahadattars.entity.Order;
import com.alahadattars.entity.OrderItem;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.User;
import com.alahadattars.enums.OrderStatus;
import com.alahadattars.enums.PaymentStatus;
import com.alahadattars.enums.RefundStatus;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.mapper.ProductVariantMapper;
import com.alahadattars.repository.AddressRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.service.OrderService;
import com.alahadattars.service.PromotionEngineService;
import com.alahadattars.service.StoreSettingsService;
import com.alahadattars.service.notification.NotificationService;
import com.alahadattars.repository.GiftServiceRepository;
import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.dto.cart.CartItemResponse;
import com.alahadattars.dto.payment.RefundResult;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.CartItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.alahadattars.service.PaymentService;
import com.alahadattars.dto.payment.PaymentVerificationRequest;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductVariantMapper variantMapper;
    private final StoreSettingsService storeSettingsService;
    private final NotificationService notificationService;
    private final PaymentService paymentService;
    private final GiftServiceRepository giftServiceRepository;
    private final PromotionEngineService promotionEngineService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public OrderResponse createOrder(String email, OrderRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Address shippingAddress = addressRepository.findByIdAndUserAndActiveTrue(request.getShippingAddressId(), user)
                .orElseThrow(() -> new ResourceNotFoundException("Shipping address not found"));

        PaymentVerificationRequest verificationRequest = PaymentVerificationRequest.builder()
                .razorpayOrderId(request.getRazorpayOrderId())
                .razorpayPaymentId(request.getRazorpayPaymentId())
                .razorpaySignature(request.getRazorpaySignature())
                .build();
                
        if (!paymentService.verifyPayment(verificationRequest)) {
            throw new IllegalArgumentException("Payment verification failed");
        }

        Order order = Order.builder()
                .orderNumber("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .user(user)
                .shippingAddress(shippingAddress)
                .status(OrderStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.PAID)
                .paymentMethod("ONLINE")
                .transactionId(request.getRazorpayPaymentId())
                .notes(request.getNotes())
                .build();

        Cart tempCart = new Cart();
        tempCart.setUser(user);
        tempCart.setItems(new java.util.ArrayList<>());
        long tempId = 1;

        // First pass: Add all paid items to the cart
        for (OrderItemRequest itemReq : request.getItems()) {
            if (!itemReq.isFreeItem()) {
                ProductVariant variant = variantRepository.findById(itemReq.getVariantId())
                        .orElseThrow(() -> new ResourceNotFoundException("Variant not found: " + itemReq.getVariantId()));

                CartItem ci = new CartItem();
                ci.setId(tempId++);
                ci.setCart(tempCart);
                ci.setProduct(variant.getProduct());
                ci.setVariant(variant);
                ci.setQuantity(itemReq.getQuantity());
                ci.setFreeItem(false);
                ci.setFreePromotionId(null);
                ci.setPrice(variant.getPrice());
                tempCart.addItem(ci);
            }
        }

        // Second pass: Validate and add free items
        for (OrderItemRequest itemReq : request.getItems()) {
            if (itemReq.isFreeItem()) {
                ProductVariant variant = variantRepository.findById(itemReq.getVariantId())
                        .orElseThrow(() -> new ResourceNotFoundException("Variant not found: " + itemReq.getVariantId()));

                // Validates against the cart (which now contains all paid items)
                promotionEngineService.validateFreeItemEligibility(tempCart, itemReq.getFreePromotionId(), variant.getId());

                CartItem ci = new CartItem();
                ci.setId(tempId++);
                ci.setCart(tempCart);
                ci.setProduct(variant.getProduct());
                ci.setVariant(variant);
                ci.setQuantity(itemReq.getQuantity());
                ci.setFreeItem(true);
                ci.setFreePromotionId(itemReq.getFreePromotionId());
                ci.setPrice(BigDecimal.ZERO);
                tempCart.addItem(ci);
            }
        }

        CartResponse cartEval = promotionEngineService.evaluateCart(tempCart, request.getCouponCode());

        // CRITICAL: Validate stock availability BEFORE creating order
        for (CartItemResponse itemRes : cartEval.getItems()) {
            ProductVariant variant = variantRepository.findById(itemRes.getVariantId())
                    .orElseThrow(() -> new ResourceNotFoundException("Variant not found: " + itemRes.getVariantId()));
            if (variant.getStock() < itemRes.getQuantity()) {
                throw new IllegalArgumentException("Insufficient stock for " + variant.getProduct().getName() + " (" + variant.getSize() + "). Available: " + variant.getStock() + ", Requested: " + itemRes.getQuantity());
            }
        }

        for (CartItemResponse itemRes : cartEval.getItems()) {
            ProductVariant variant = variantRepository.findById(itemRes.getVariantId()).orElseThrow();

            // Deduct inventory (including free items — they consume stock)
            variant.setStock(variant.getStock() - itemRes.getQuantity());
            variantRepository.save(variant);

            boolean isFreeOrderItem = itemRes.isFreeItem();
            BigDecimal originalPrice = variant.getPrice(); // Always store actual market price
            BigDecimal unitPrice = isFreeOrderItem ? BigDecimal.ZERO : itemRes.getFinalPrice();
            BigDecimal discountAmt = isFreeOrderItem
                    ? originalPrice // Entire price is the "discount" for free items
                    : itemRes.getDiscountAmount();
            BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(itemRes.getQuantity()));

            OrderItem orderItem = OrderItem.builder()
                    .variant(variant)
                    .quantity(itemRes.getQuantity())
                    .originalPrice(originalPrice)
                    .discountAmount(discountAmt)
                    .unitPrice(unitPrice)
                    .subtotal(subtotal)
                    .productName(variant.getProduct().getName())
                    .variantSize(variant.getSize())
                    .freeItem(isFreeOrderItem)
                    .freePromotionId(isFreeOrderItem ? itemRes.getFreePromotionId() : null)
                    .build();

            order.addItem(orderItem);
        }

        com.alahadattars.entity.StoreSettings settings = storeSettingsService.getSettingsEntity();
        BigDecimal threshold = settings.getFreeShippingThreshold() != null ? settings.getFreeShippingThreshold() : new BigDecimal("500");
        BigDecimal charge = settings.getShippingCharge() != null ? settings.getShippingCharge() : new BigDecimal("50");
        
        BigDecimal subtotalAfterItemDiscounts = cartEval.getSubtotal().subtract(cartEval.getItemDiscounts());
        BigDecimal shippingCost = subtotalAfterItemDiscounts.compareTo(threshold) >= 0 ? BigDecimal.ZERO : charge;
        
        if (cartEval.getAppliedPromotions().stream().anyMatch(p -> (p.getName() != null && p.getName().contains("Free Shipping")) || (p.getDescription() != null && p.getDescription().contains("Free Shipping")))) {
            shippingCost = BigDecimal.ZERO;
        }
        
        BigDecimal giftServicePrice = BigDecimal.ZERO;
        String giftServiceName = null;
        Long giftServiceId = request.getGiftServiceId();
        if (giftServiceId != null) {
            com.alahadattars.entity.GiftService giftSvc = giftServiceRepository.findById(giftServiceId)
                    .orElseThrow(() -> new ResourceNotFoundException("Gift service not found: " + giftServiceId));
            if (!giftSvc.isActive()) {
                throw new IllegalArgumentException("Selected gift service is not available.");
            }
            giftServicePrice = giftSvc.getPrice();
            giftServiceName = giftSvc.getName();
        }

        BigDecimal totalAmount = cartEval.getTotal().add(shippingCost).add(giftServicePrice);

        order.setShippingCost(shippingCost);
        order.setOfferDiscountAmount(cartEval.getItemDiscounts());
        order.setCouponDiscountAmount(cartEval.getCartDiscount());

        // Save applied promotions snapshot for historical accuracy
        try {
            if (cartEval.getAppliedPromotions() != null && !cartEval.getAppliedPromotions().isEmpty()) {
                order.setAppliedPromotionsSnapshot(objectMapper.writeValueAsString(cartEval.getAppliedPromotions()));
            }
        } catch (Exception e) {
            log.error("Failed to serialize applied promotions", e);
        }

        order.setGiftServiceId(giftServiceId);
        order.setGiftServiceName(giftServiceName);
        order.setGiftServicePrice(giftServicePrice);
        order.setGiftMessage(request.getGiftMessage());
        order.setTotalAmount(totalAmount);

        Order savedOrder = orderRepository.save(order);
        
        // Trigger notification after payment verification and inventory updates are successful
        notificationService.sendOrderNotification(savedOrder);
        
        return mapToResponse(savedOrder);
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<OrderResponse> getUserOrders(String email, org.springframework.data.domain.Pageable pageable) {
        return orderRepository.findByUserEmail(email, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(String email, Long orderId) {
        return orderRepository.findByIdAndUserEmail(orderId, email)
                .map(this::mapToResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<OrderResponse> getAllOrders(String search, org.springframework.data.domain.Pageable pageable) {
        if (search != null && !search.trim().isEmpty()) {
            return orderRepository.searchOrders(search, pageable).map(this::mapToResponse);
        }
        return orderRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
                
        order.setStatus(OrderStatus.valueOf(status.toUpperCase()));
        return mapToResponse(orderRepository.save(order));
    }

    @Override
    @Transactional
    public OrderResponse updateShippingDetails(Long orderId, com.alahadattars.dto.order.ShippingUpdateRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        
        if (request.getCourierName() != null) order.setCourierName(request.getCourierName());
        if (request.getTrackingNumber() != null) order.setTrackingNumber(request.getTrackingNumber());
        if (request.getExpectedDeliveryDate() != null) order.setExpectedDeliveryDate(request.getExpectedDeliveryDate());
        if (request.getShipmentNotes() != null) order.setShipmentNotes(request.getShipmentNotes());
        
        return mapToResponse(orderRepository.save(order));
    }

    @Override
    @Transactional
    public OrderResponse updatePaymentStatus(Long orderId, String paymentStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
                
        order.setPaymentStatus(PaymentStatus.valueOf(paymentStatus.toUpperCase()));
        return mapToResponse(orderRepository.save(order));
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(String email, Long orderId) {
        Order order = orderRepository.findByIdAndUserEmail(orderId, email)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        OrderStatus currentStatus = order.getStatus();

        if (currentStatus != OrderStatus.CONFIRMED) {
            String reason;
            switch (currentStatus) {
                case PACKED:
                    reason = "This order can no longer be cancelled because it has already been packed.";
                    break;
                case SHIPPED:
                    reason = "This order can no longer be cancelled because it has already been shipped.";
                    break;
                case DELIVERED:
                    reason = "This order can no longer be cancelled because it has already been delivered.";
                    break;
                case CANCELLED:
                    reason = "This order has already been cancelled.";
                    break;
                default:
                    reason = "This order cannot be cancelled at this stage.";
            }
            throw new BadRequestException(reason);
        }

        // 1. Cancel the order
        order.setStatus(OrderStatus.CANCELLED);

        // 2. Restore inventory for each item
        for (OrderItem item : order.getItems()) {
            if (item.getVariant() != null) {
                ProductVariant variant = item.getVariant();
                variant.setStock(variant.getStock() + item.getQuantity());
                variantRepository.save(variant);
                log.info("Inventory restored for variant {} (+{})", variant.getId(), item.getQuantity());
            }
        }

        // 3. Set refund status based on payment
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            order.setRefundStatus(RefundStatus.PENDING);
            order.setRefundAmount(order.getTotalAmount());
            log.info("Order {} cancelled by customer. Refund PENDING for amount {}", orderId, order.getTotalAmount());
        } else {
            order.setRefundStatus(RefundStatus.NOT_REQUIRED);
            log.info("Order {} cancelled by customer. No refund required (payment status: {})", orderId, order.getPaymentStatus());
        }

        // 4. Send notification (best-effort)
        try {
            notificationService.sendRefundPendingNotification(order);
        } catch (Exception e) {
            log.warn("Failed to send refund pending notification for order {}: {}", orderId, e.getMessage());
        }

        return mapToResponse(orderRepository.save(order));
    }

    @Override
    @Transactional
    public OrderResponse initiateRefund(String adminEmail, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        // Guard 1: Must be CANCELLED
        if (order.getStatus() != OrderStatus.CANCELLED) {
            throw new BadRequestException("Refund can only be issued for cancelled orders. Current status: " + order.getStatus());
        }

        // Guard 2: Payment must be PAID
        if (order.getPaymentStatus() != PaymentStatus.PAID) {
            throw new BadRequestException("Refund not applicable. Payment status is: " + order.getPaymentStatus());
        }

        // Guard 3: Prevent double-refund
        if (order.getRefundStatus() == RefundStatus.COMPLETED) {
            throw new BadRequestException("A refund has already been completed for this order. Refund ID: " + order.getRefundId());
        }

        // Guard 4: Must have a payment ID to refund against
        if (order.getTransactionId() == null || order.getTransactionId().isBlank()) {
            throw new BadRequestException("No Razorpay payment ID found on this order. Cannot process refund.");
        }

        BigDecimal refundAmount = order.getRefundAmount() != null ? order.getRefundAmount() : order.getTotalAmount();

        // Set to PROCESSING before calling Razorpay (optimistic update)
        order.setRefundStatus(RefundStatus.PROCESSING);
        order.setRefundInitiatedAt(LocalDateTime.now());
        order.setRefundInitiatedBy(adminEmail);
        order.setRefundAmount(refundAmount);
        order.setRefundFailureReason(null); // Clear any previous failure
        orderRepository.save(order);

        // Call Razorpay Refund API
        RefundResult result = paymentService.initiateRefund(order.getTransactionId(), refundAmount);

        if (result.isSuccess()) {
            order.setRefundStatus(RefundStatus.COMPLETED);
            order.setRefundId(result.getRefundId());
            order.setRefundCompletedAt(LocalDateTime.now());
            log.info("Refund COMPLETED for order {} | Refund ID: {} | Admin: {}", orderId, result.getRefundId(), adminEmail);

            // Notify customer (best-effort)
            try {
                notificationService.sendRefundCompletedNotification(order);
            } catch (Exception e) {
                log.warn("Failed to send refund completion notification for order {}: {}", orderId, e.getMessage());
            }
        } else {
            order.setRefundStatus(RefundStatus.FAILED);
            order.setRefundFailureReason(result.getErrorMessage());
            log.error("Refund FAILED for order {} | Error: {} | Admin: {}", orderId, result.getErrorMessage(), adminEmail);
        }

        return mapToResponse(orderRepository.save(order));
    }

    private OrderResponse mapToResponse(Order order) {
        Address addr = order.getShippingAddress();
        AddressResponse addressResponse = AddressResponse.builder()
                .id(addr.getId())
                .fullName(addr.getFullName())
                .phone(addr.getPhone())
                .addressLine1(addr.getAddressLine1())
                .addressLine2(addr.getAddressLine2())
                .landmark(addr.getLandmark())
                .city(addr.getCity())
                .state(addr.getState())
                .postalCode(addr.getPostalCode())
                .country(addr.getCountry())
                .build();

        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .shippingAddress(addressResponse)
                .totalAmount(order.getTotalAmount())
                .shippingCost(order.getShippingCost())
                .offerDiscountAmount(order.getOfferDiscountAmount())
                .couponDiscountAmount(order.getCouponDiscountAmount())
                .status(order.getStatus())
                .paymentStatus(order.getPaymentStatus())
                .paymentMethod(order.getPaymentMethod())
                .transactionId(order.getTransactionId())
                .notes(order.getNotes())
                .courierName(order.getCourierName())
                .trackingNumber(order.getTrackingNumber())
                .expectedDeliveryDate(order.getExpectedDeliveryDate())
                .shipmentNotes(order.getShipmentNotes())
                .giftServiceId(order.getGiftServiceId())
                .giftServiceName(order.getGiftServiceName())
                .giftServicePrice(order.getGiftServicePrice())
                .giftMessage(order.getGiftMessage())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .items(order.getItems().stream().map(this::mapItemToResponse).collect(Collectors.toList()))
                // Refund fields
                .refundStatus(order.getRefundStatus())
                .refundId(order.getRefundId())
                .refundAmount(order.getRefundAmount())
                .refundInitiatedAt(order.getRefundInitiatedAt())
                .refundCompletedAt(order.getRefundCompletedAt())
                .refundFailureReason(order.getRefundFailureReason())
                .refundInitiatedBy(order.getRefundInitiatedBy())
                .build();
    }


    private OrderItemResponse mapItemToResponse(OrderItem item) {
        return OrderItemResponse.builder()
                .id(item.getId())
                .variant(variantMapper.toResponse(item.getVariant()))
                .quantity(item.getQuantity())
                .originalPrice(item.getOriginalPrice())
                .discountAmount(item.getDiscountAmount())
                .unitPrice(item.getUnitPrice())
                .subtotal(item.getSubtotal())
                .productName(item.getProductName())
                .variantSize(item.getVariantSize())
                .build();
    }
}
