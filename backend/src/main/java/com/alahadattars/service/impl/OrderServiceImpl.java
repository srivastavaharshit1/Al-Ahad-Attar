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
import com.alahadattars.repository.CartRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRedemptionRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionRedemption;
import com.alahadattars.dto.promotion.PromotionResponse;
import com.alahadattars.service.OrderService;
import com.alahadattars.service.PromotionEngineService;
import com.alahadattars.service.StoreSettingsService;
import com.alahadattars.service.EmailService;
import com.alahadattars.service.notification.NotificationService;
import com.alahadattars.dto.email.AdminNewOrderEmailData;
import com.alahadattars.dto.email.AdminOrderCancelledEmailData;
import com.alahadattars.dto.email.AdminRefundFailedEmailData;
import com.alahadattars.dto.email.EmailAddress;
import com.alahadattars.dto.email.EmailOrderItem;
import com.alahadattars.dto.email.OrderCancelledEmailData;
import com.alahadattars.dto.email.OrderConfirmationEmailData;
import com.alahadattars.dto.email.OrderDeliveredEmailData;
import com.alahadattars.dto.email.OrderPackedEmailData;
import com.alahadattars.dto.email.OrderShippedEmailData;
import com.alahadattars.dto.email.RefundSuccessfulEmailData;
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
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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
    private final PaymentIntentRepository paymentIntentRepository;
    private final CartRepository cartRepository;
    private final PromotionRepository promotionRepository;
    private final PromotionRedemptionRepository promotionRedemptionRepository;
    private final EmailService emailService;
    private final RefundTransactionSupport refundTransactionSupport;
    private final com.alahadattars.service.StorageService storageService;

    private static final DateTimeFormatter EMAIL_DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

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
            throw new BadRequestException("Payment verification failed");
        }

        // A valid signature only proves *a* payment happened for *a* Razorpay order. Bind it to the payment
        // we actually initiated: same user, unspent, and (below, once the total is known) the same amount.
        PaymentIntent intent = paymentIntentRepository.findByRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new BadRequestException("Unknown payment reference. Please restart checkout."));

        if (intent.getUser() == null || !intent.getUser().getId().equals(user.getId())) {
            log.warn("Payment intent {} does not belong to user {}", request.getRazorpayOrderId(), email);
            throw new BadRequestException("Payment does not belong to this account.");
        }

        if (intent.isConsumed()) {
            log.warn("Replay attempt on already-consumed payment intent {} by user {}",
                    request.getRazorpayOrderId(), email);
            throw new BadRequestException("This payment has already been used for another order.");
        }

        if (orderRepository.existsByTransactionId(request.getRazorpayPaymentId())) {
            log.warn("Replay attempt using transaction id {} already attached to an order", request.getRazorpayPaymentId());
            throw new BadRequestException("This payment has already been used for another order.");
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
        // Mirror the promotion the user selected on their real cart. The payment amount was computed from
        // that cart, so omitting it here would make the reconciliation below reject legitimate checkouts.
        cartRepository.findByUserEmail(email)
                .ifPresent(persisted -> tempCart.setManuallySelectedPromotionId(persisted.getManuallySelectedPromotionId()));
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
                throw new BadRequestException("Insufficient stock for " + variant.getProduct().getName() + " (" + variant.getSize() + "). Available: " + variant.getStock() + ", Requested: " + itemRes.getQuantity());
            }
        }

        for (CartItemResponse itemRes : cartEval.getItems()) {
            ProductVariant variant = variantRepository.findById(itemRes.getVariantId()).orElseThrow();

            // Deduct inventory atomically (including free items — they consume stock). The
            // friendly pre-check above catches the common case; this atomic UPDATE is what
            // actually prevents overselling when two concurrent checkouts race for the last
            // units — a plain read-modify-write here can lose one buyer's decrement.
            if (variantRepository.decrementStock(variant.getId(), itemRes.getQuantity()) == 0) {
                throw new BadRequestException("Insufficient stock for " + variant.getProduct().getName()
                        + " (" + variant.getSize() + "). Stock just changed — please refresh your cart and try again.");
            }

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
                throw new BadRequestException("Selected gift service is not available.");
            }
            giftServicePrice = giftSvc.getPrice();
            giftServiceName = giftSvc.getName();
        }

        BigDecimal totalAmount = cartEval.getTotal().add(shippingCost).add(giftServicePrice);

        // Reconcile against what Razorpay was actually asked to collect. Compared in paise, exactly as the
        // amount was submitted, so scale differences between the two BigDecimals cannot cause false rejects.
        int chargedPaise = intent.getAmount().multiply(BigDecimal.valueOf(100)).intValue();
        int orderPaise = totalAmount.multiply(BigDecimal.valueOf(100)).intValue();
        if (chargedPaise != orderPaise) {
            log.warn("Order total mismatch for payment intent {} (user {}): charged {} paise, order totals {} paise",
                    request.getRazorpayOrderId(), email, chargedPaise, orderPaise);
            throw new BadRequestException("Order total does not match the amount paid. Please restart checkout.");
        }

        // Conditional update — returns 0 if another request consumed this intent first, so concurrent
        // replays of the same triple cannot both succeed.
        int consumed = paymentIntentRepository.markConsumed(
                intent.getId(), request.getRazorpayPaymentId(), LocalDateTime.now());
        if (consumed == 0) {
            log.warn("Concurrent replay lost the race for payment intent {} (user {})",
                    request.getRazorpayOrderId(), email);
            throw new BadRequestException("This payment has already been used for another order.");
        }

        // Claim one redemption per applied promotion. The conditional update fails when the global limit is
        // already exhausted, so configured limits actually hold rather than being advisory.
        List<PromotionRedemption> redemptions = new ArrayList<>();
        if (cartEval.getAppliedPromotions() != null) {
            for (PromotionResponse applied : cartEval.getAppliedPromotions()) {
                if (applied == null || applied.getId() == null) continue;

                Promotion promo = promotionRepository.findById(applied.getId()).orElse(null);
                if (promo == null) continue;

                Integer perUserLimit = promo.getPerUserLimit();
                if (perUserLimit != null && perUserLimit > 0) {
                    long alreadyUsed = promotionRedemptionRepository
                            .countByPromotionIdAndUserId(promo.getId(), user.getId());
                    if (alreadyUsed >= perUserLimit) {
                        throw new BadRequestException(
                                "You have already used the promotion '" + promo.getName() + "'.");
                    }
                }

                if (promotionRepository.claimRedemption(promo.getId()) == 0) {
                    throw new BadRequestException(
                            "The promotion '" + promo.getName() + "' is no longer available.");
                }

                redemptions.add(PromotionRedemption.builder()
                        .promotion(promo)
                        .user(user)
                        .build());
            }
        }

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

        if (!redemptions.isEmpty()) {
            redemptions.forEach(redemption -> redemption.setOrderId(savedOrder.getId()));
            promotionRedemptionRepository.saveAll(redemptions);
        }

        // Trigger notification after payment verification and inventory updates are successful
        notificationService.sendOrderNotification(savedOrder);

        List<EmailOrderItem> emailItems = toEmailItems(savedOrder.getItems());
        EmailAddress emailAddress = toEmailAddress(savedOrder.getShippingAddress());

        emailService.sendOrderConfirmedEmail(new OrderConfirmationEmailData(
                user.getEmail(),
                user.getFirstName() + " " + user.getLastName(),
                savedOrder.getOrderNumber(),
                formatEmailDate(savedOrder.getCreatedAt()),
                emailItems,
                emailAddress,
                savedOrder.getTotalAmount(),
                savedOrder.getPaymentMethod()
        ));

        emailService.sendAdminNewOrderEmail(new AdminNewOrderEmailData(
                savedOrder.getOrderNumber(),
                user.getFirstName() + " " + user.getLastName(),
                shippingAddress.getPhone(),
                emailAddress,
                emailItems,
                savedOrder.getTotalAmount()
        ));

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

    /**
     * The only legal forward transitions in the order lifecycle. CONFIRMED has no entry here —
     * orders are created directly as CONFIRMED at checkout (see {@link #createOrder}) and are
     * never transitioned into it from another state. CANCELLED is handled separately by
     * {@link #cancelOrder}/{@link #adminCancelOrder} (it has side effects — inventory restoration,
     * refund flagging — that a generic status setter must not perform implicitly).
     */
    private static final java.util.Map<OrderStatus, OrderStatus> REQUIRED_PRIOR_STATUS = java.util.Map.of(
            OrderStatus.PACKED, OrderStatus.CONFIRMED,
            OrderStatus.SHIPPED, OrderStatus.PACKED,
            OrderStatus.DELIVERED, OrderStatus.SHIPPED
    );

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, String status) {
        OrderStatus newStatus;
        try {
            newStatus = OrderStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid order status: " + status);
        }

        if (newStatus == OrderStatus.CANCELLED) {
            throw new BadRequestException("Cancelling an order restores inventory and flags a refund — "
                    + "use the dedicated cancel action instead of a generic status update.");
        }

        OrderStatus requiredPrior = REQUIRED_PRIOR_STATUS.get(newStatus);
        if (requiredPrior == null) {
            throw new BadRequestException("Cannot transition an order to " + newStatus + ".");
        }

        // Atomic — the sole guard against a status transition racing a cancellation for the same
        // order (e.g. a customer cancelling at the exact instant an admin marks it packed). A
        // plain read-modify-write here could let a stale in-memory read silently overwrite a
        // cancellation that committed in between; this UPDATE only takes effect if the order is
        // still exactly `requiredPrior` at the moment it runs.
        if (orderRepository.claimStatusTransition(orderId, requiredPrior, newStatus) == 0) {
            OrderStatus actual = orderRepository.findById(orderId)
                    .map(Order::getStatus)
                    .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
            throw new BadRequestException(transitionRejectionMessage(actual, newStatus));
        }

        Order saved = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        switch (newStatus) {
            case PACKED -> sendOrderPackedEmail(saved);
            case SHIPPED -> sendOrderShippedEmail(saved);
            case DELIVERED -> sendOrderDeliveredEmail(saved);
            default -> { }
        }

        return mapToResponse(saved);
    }

    private String transitionRejectionMessage(OrderStatus current, OrderStatus target) {
        if (current == target) {
            return "This order is already " + target.name().toLowerCase() + ".";
        }
        return "Cannot mark this order as " + target.name().toLowerCase() + " — its current status is "
                + current.name().toLowerCase() + ".";
    }

    private void sendOrderPackedEmail(Order order) {
        User user = order.getUser();
        if (user == null || user.getEmail() == null) {
            return;
        }
        emailService.sendOrderPackedEmail(new OrderPackedEmailData(
                user.getEmail(),
                user.getFirstName() + " " + user.getLastName(),
                order.getOrderNumber()
        ));
    }

    private void sendOrderShippedEmail(Order order) {
        User user = order.getUser();
        if (user == null || user.getEmail() == null) {
            return;
        }
        emailService.sendOrderShippedEmail(new OrderShippedEmailData(
                user.getEmail(),
                user.getFirstName() + " " + user.getLastName(),
                order.getOrderNumber(),
                order.getTrackingNumber(),
                order.getCourierName(),
                order.getExpectedDeliveryDate() != null ? order.getExpectedDeliveryDate().toString() : null
        ));
    }

    private void sendOrderDeliveredEmail(Order order) {
        User user = order.getUser();
        if (user == null || user.getEmail() == null) {
            return;
        }
        emailService.sendOrderDeliveredEmail(new OrderDeliveredEmailData(
                user.getEmail(),
                user.getFirstName() + " " + user.getLastName(),
                order.getOrderNumber(),
                formatEmailDate(order.getCreatedAt()),
                toEmailItems(order.getItems()),
                order.getTotalAmount()
        ));
    }

    private List<EmailOrderItem> toEmailItems(List<OrderItem> items) {
        if (items == null) {
            return List.of();
        }
        return items.stream()
                .map(item -> new EmailOrderItem(item.getProductName(), item.getVariantSize(), item.getQuantity(), item.getUnitPrice()))
                .collect(Collectors.toList());
    }

    private EmailAddress toEmailAddress(Address address) {
        if (address == null) {
            return null;
        }
        return new EmailAddress(
                address.getFullName(),
                address.getPhone(),
                address.getAddressLine1(),
                address.getAddressLine2(),
                address.getCity(),
                address.getState(),
                address.getPostalCode(),
                address.getCountry()
        );
    }

    private String formatEmailDate(LocalDateTime dateTime) {
        return dateTime != null ? dateTime.format(EMAIL_DATE_FORMAT) : "";
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

    /**
     * Customer-initiated cancellation. Business rule: only a CONFIRMED order can be cancelled —
     * once PACKED, cancellation is permanently disabled (the customer must contact support).
     * Never calls Razorpay: restores inventory and, for paid orders, flags the refund as
     * REFUND_REQUIRED — the actual refund is a separate, admin-triggered action (see
     * {@link #initiateRefund}). See RefundTransactionSupport's Javadoc for why the DB-only work
     * is delegated there rather than done inline here.
     */
    @Override
    public OrderResponse cancelOrder(String email, Long orderId) {
        Order order = refundTransactionSupport.claimCancellationAndPrepareRefund(orderId, email);
        sendCancellationEmails(order);
        return mapToResponse(order);
    }

    /**
     * Admin-initiated cancellation — identical CONFIRMED-only rule and atomic claim as
     * {@link #cancelOrder}, just not restricted to the order's owner.
     */
    @Override
    public OrderResponse adminCancelOrder(String adminEmail, Long orderId) {
        Order order = refundTransactionSupport.claimAdminCancellation(orderId, adminEmail);
        sendCancellationEmails(order);
        return mapToResponse(order);
    }

    private void sendCancellationEmails(Order order) {
        User user = order.getUser();
        String customerName = user != null ? (user.getFirstName() + " " + user.getLastName()) : "Customer";
        String customerEmail = user != null ? user.getEmail() : null;
        boolean refundRequired = order.getRefundStatus() == RefundStatus.REFUND_REQUIRED;

        if (customerEmail != null) {
            emailService.sendOrderCancelledEmail(new OrderCancelledEmailData(
                    customerEmail,
                    customerName,
                    order.getOrderNumber(),
                    formatEmailDate(order.getCancelledAt() != null ? order.getCancelledAt() : LocalDateTime.now()),
                    order.getTotalAmount(),
                    refundRequired
            ));
        }

        emailService.sendAdminOrderCancelledEmail(new AdminOrderCancelledEmailData(
                order.getOrderNumber(),
                customerName,
                order.getTotalAmount(),
                order.getRefundStatus() != null ? order.getRefundStatus().name() : RefundStatus.NOT_REQUIRED.name()
        ));
    }

    /**
     * Admin-only: processes the full Razorpay refund for a cancelled, paid order. If a prior
     * attempt was left PROCESSING because its outcome was never recorded locally (a crash or
     * network timeout after Razorpay may have already accepted it), reconciles with Razorpay's
     * own record instead of blindly retrying (risking a real double-refund at Razorpay) or
     * blindly marking it FAILED (risking an incorrect retry later if it actually did succeed).
     */
    @Override
    public OrderResponse initiateRefund(String adminEmail, Long orderId) {
        Order existing = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        if (existing.getRefundStatus() == RefundStatus.PROCESSING) {
            return reconcileStuckProcessingRefund(existing, adminEmail);
        }

        // Same connection-holding concern as cancelOrder: guards + claim commit on their own
        // before the blocking Razorpay call, which then runs with no transaction/connection held.
        RefundTransactionSupport.AdminRefundPreparation prep =
                refundTransactionSupport.claimAdminRefundProcessing(orderId, adminEmail);

        RefundResult result = paymentService.initiateRefund(prep.order().getTransactionId(), prep.refundAmount());

        Order savedOrder = refundTransactionSupport.recordAdminRefundOutcome(prep.order(), result, prep.refundAmount(), prep.initiatedAt());

        handleAdminRefundOutcome(savedOrder, result, adminEmail);

        return mapToResponse(savedOrder);
    }

    private OrderResponse reconcileStuckProcessingRefund(Order order, String adminEmail) {
        BigDecimal refundAmount = order.getRefundAmount() != null ? order.getRefundAmount() : order.getTotalAmount();
        java.util.Optional<RefundResult> reconciled = paymentService.checkExistingRefund(order.getTransactionId(), refundAmount);

        if (reconciled.isEmpty()) {
            // Genuinely unknown — do NOT assume failure and do NOT allow a new refund attempt to
            // fire while Razorpay's own outcome for the earlier attempt is still unconfirmed.
            throw new BadRequestException("Refund processing could not be confirmed with Razorpay yet. "
                    + "No additional refund has been created. Please check back shortly before retrying.");
        }

        Order savedOrder = refundTransactionSupport.recordAdminRefundOutcome(order, reconciled.get(), refundAmount, order.getRefundInitiatedAt());
        handleAdminRefundOutcome(savedOrder, reconciled.get(), adminEmail);
        return mapToResponse(savedOrder);
    }

    private void handleAdminRefundOutcome(Order savedOrder, RefundResult result, String adminEmail) {
        User user = savedOrder.getUser();
        String customerName = user != null ? (user.getFirstName() + " " + user.getLastName()) : "Customer";

        if (result.isSuccess()) {
            log.info("Refund REFUNDED for order {} | Refund ID: {} | Admin: {}", savedOrder.getId(), result.getRefundId(), adminEmail);
            if (user != null && user.getEmail() != null) {
                emailService.sendRefundSuccessfulEmail(new RefundSuccessfulEmailData(
                        user.getEmail(),
                        customerName,
                        savedOrder.getOrderNumber(),
                        savedOrder.getRefundAmount(),
                        savedOrder.getRefundId(),
                        formatEmailDate(savedOrder.getRefundCompletedAt())
                ));
            }
            try {
                notificationService.sendRefundCompletedNotification(savedOrder);
            } catch (Exception e) {
                log.warn("Failed to send refund completion notification for order {}: {}", savedOrder.getId(), e.getMessage());
            }
        } else {
            log.error("Refund FAILED for order {} | Error: {} | Admin: {}", savedOrder.getId(), result.getErrorMessage(), adminEmail);
            emailService.sendAdminRefundFailedEmail(new AdminRefundFailedEmailData(
                    savedOrder.getOrderNumber(),
                    customerName,
                    savedOrder.getRefundAmount(),
                    result.getErrorMessage()
            ));
        }
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<OrderResponse> getRefunds(
            String status, String search, org.springframework.data.domain.Pageable pageable) {
        RefundStatus refundStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                refundStatus = RefundStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid refund status: " + status);
            }
        }
        String searchTerm = (search != null && !search.isBlank()) ? search.trim() : null;
        return orderRepository.searchRefunds(refundStatus, searchTerm, pageable).map(this::mapToResponse);
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
                .cancelledAt(order.getCancelledAt())
                .cancelledBy(order.getCancelledBy())
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


    private String resolveOrderItemImage(com.alahadattars.entity.ProductVariant variant) {
        if (variant == null) return null;
        if (variant.getImage() != null && !variant.getImage().isBlank()) {
            return variant.getImage();
        }
        com.alahadattars.entity.Product product = variant.getProduct();
        if (product == null || product.getImages() == null || product.getImages().isEmpty()) {
            return null;
        }
        com.alahadattars.entity.ProductImage primary = product.getImages().stream()
                .filter(img -> img.isActive() && img.isPrimary())
                .findFirst()
                .orElseGet(() -> product.getImages().stream()
                        .filter(com.alahadattars.entity.ProductImage::isActive)
                        .findFirst()
                        .orElse(product.getImages().isEmpty() ? null : product.getImages().get(0)));
        if (primary == null) return null;
        return storageService.resolveUrl(primary.getImageUrl(), "/api/images/" + primary.getId() + "/file");
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
                .productImage(resolveOrderItemImage(item.getVariant()))
                .build();
    }
}
