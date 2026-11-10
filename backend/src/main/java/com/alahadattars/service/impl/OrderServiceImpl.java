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
import com.alahadattars.enums.ReconciliationStatus;
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
import com.alahadattars.repository.WebhookEventRepository;
import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionRedemption;
import com.alahadattars.dto.promotion.PromotionResponse;
import com.alahadattars.service.OrderService;
import com.alahadattars.service.PromotionEngineService;
import com.alahadattars.service.ProductImageResolver;
import com.alahadattars.service.StoreSettingsService;
import com.alahadattars.service.EmailService;
import com.alahadattars.service.notification.NotificationService;
import com.alahadattars.event.OrderCreatedEvent;
import org.springframework.context.ApplicationEventPublisher;
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

import com.alahadattars.dto.order.OrderItemGiftSetComponentResponse;
import com.alahadattars.entity.GiftSet;
import com.alahadattars.entity.GiftSetImage;
import com.alahadattars.entity.GiftSetItem;
import com.alahadattars.entity.OrderItemGiftSetComponent;
import com.alahadattars.repository.GiftSetRepository;
import com.alahadattars.repository.OrderItemGiftSetComponentRepository;
import com.alahadattars.service.GiftSetService;
import com.alahadattars.service.PaymentService;
import com.alahadattars.service.GuestCheckoutLockService;
import com.alahadattars.dto.payment.PaymentVerificationRequest;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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
    private final PromotionEngineService promotionEngineService;
    private final ObjectMapper objectMapper;
    private final PaymentIntentRepository paymentIntentRepository;
    private final CartRepository cartRepository;
    private final PromotionRepository promotionRepository;
    private final PromotionRedemptionRepository promotionRedemptionRepository;
    private final EmailService emailService;
    private final RefundTransactionSupport refundTransactionSupport;
    private final com.alahadattars.repository.BottleRepository bottleRepository;
    private final com.alahadattars.service.StorageService storageService;
    private final ProductImageResolver productImageResolver;
    private final WebhookEventRepository webhookEventRepository;
    private final GuestCheckoutLockService guestCheckoutLockService;
    private final ApplicationEventPublisher eventPublisher;
    private final GiftSetRepository giftSetRepository;
    private final GiftSetService giftSetService;
    private final OrderItemGiftSetComponentRepository orderItemGiftSetComponentRepository;

    private static final DateTimeFormatter EMAIL_DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public OrderResponse createOrder(String email, OrderRequest request) {
        User user = null;
        Address shippingAddress = null;

        if (email != null) {
            // Serialize concurrent checkouts for this specific authenticated user via an explicit write lock (UPDATE)
            // This guarantees cross-RDBMS blocking (H2, Postgres, etc.) without relying on SELECT FOR UPDATE dialects.
            userRepository.acquireUserLock(email);

            user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            shippingAddress = addressRepository.findByIdAndUserAndActiveTrue(request.getShippingAddressId(), user)
                    .orElseThrow(() -> new ResourceNotFoundException("Shipping address not found"));
        } else {
            if (request.getGuestEmail() == null || request.getGuestAddress() == null) {
                throw new BadRequestException("Guest information is required");
            }
            guestCheckoutLockService.acquireLock(request.getGuestEmail());
            shippingAddress = Address.builder()
                .fullName(request.getGuestName())
                .phone(request.getGuestPhone())
                .guestEmail(request.getGuestEmail())
                .addressLine1(request.getGuestAddress().getAddressLine1())
                .addressLine2(request.getGuestAddress().getAddressLine2())
                .landmark(request.getGuestAddress().getLandmark())
                .city(request.getGuestAddress().getCity())
                .state(request.getGuestAddress().getState())
                .postalCode(request.getGuestAddress().getPostalCode())
                .country(request.getGuestAddress().getCountry())
                .build();
            shippingAddress = addressRepository.save(shippingAddress);
        }

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
        // CRITICAL CONCURRENCY FIX: We acquire the PESSIMISTIC_WRITE lock here *before* checking the webhook
        // event repository. This perfectly eliminates the TOCTOU gap by forcing any concurrent webhook delivery
        // to queue at the database level until this transaction commits.
        PaymentIntent intent = paymentIntentRepository.findByRazorpayOrderIdForUpdate(request.getRazorpayOrderId())
                .orElseThrow(() -> new BadRequestException("Unknown payment reference. Please restart checkout."));

        if (email != null && (intent.getUser() == null || !intent.getUser().getId().equals(user.getId()))) {
            log.warn("Payment intent {} does not belong to user {}", request.getRazorpayOrderId(), email);
            throw new BadRequestException("Payment does not belong to this account.");
        }

        if (email == null && intent.getUser() != null) {
            log.warn("Payment intent {} does not belong to guest", request.getRazorpayOrderId());
            throw new BadRequestException("Payment does not belong to this account.");
        }

        if (intent.isConsumed()) {
            ReconciliationStatus reconStatus = intent.getReconciliationStatus();
            if (reconStatus == ReconciliationStatus.REFUNDED) {
                String refMsg = intent.getReconciliationRefundId() != null
                        ? " Refund reference: " + intent.getReconciliationRefundId() + "." : "";
                throw new BadRequestException("Your payment was received, but your checkout session expired before your order was finalized. "
                        + "A full refund of ₹" + intent.getAmount() + " has been processed back to your original payment method."
                        + refMsg + " Please allow 3 to 5 business days for bank settlement.");
            } else if (reconStatus == ReconciliationStatus.PENDING_CONFIRMATION) {
                throw new BadRequestException("Your payment was received, but your checkout session expired before order completion. "
                        + "We are currently verifying your payment status with the gateway to ensure your funds are protected. "
                        + "You will receive an email update shortly once verified, or you may contact support quoting reference: "
                        + intent.getRazorpayOrderId());
            } else if (reconStatus == ReconciliationStatus.PROCESSING) {
                throw new BadRequestException("Your payment was received, but your checkout session expired before order completion. "
                        + "Your transaction is currently being verified. "
                        + "Please contact support quoting reference: " + intent.getRazorpayOrderId() + " if you require immediate assistance.");
            } else if (reconStatus == ReconciliationStatus.FAILED) {
                throw new BadRequestException("Your payment was received, but your checkout session expired. "
                        + "An automatic resolution could not be completed immediately. Our support team has been alerted and will assist you. "
                        + "Please contact support quoting payment reference: " + intent.getRazorpayOrderId());
            }
            log.warn("Replay attempt on already-consumed payment intent {} by user {}",
                    request.getRazorpayOrderId(), email);
            throw new BadRequestException("This payment has already been used for another order.");
        }

        if (orderRepository.existsByTransactionId(request.getRazorpayPaymentId())) {
            log.warn("Replay attempt using transaction id {} already attached to an order", request.getRazorpayPaymentId());
            throw new BadRequestException("This payment has already been used for another order.");
        }

        // A successful synchronous signature verification is cryptographic proof the payment succeeded.
        PaymentStatus initialPaymentStatus = PaymentStatus.PAID;

        Order order = Order.builder()
                .orderNumber("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .user(user)
                .guestEmail(request.getGuestEmail())
                .guestName(request.getGuestName())
                .guestPhone(request.getGuestPhone())
                .shippingAddress(shippingAddress)
                .status(OrderStatus.CONFIRMED)
                .paymentStatus(initialPaymentStatus)
                .paymentMethod("ONLINE")
                .transactionId(request.getRazorpayPaymentId())
                .notes(request.getNotes())
                .build();

        Cart tempCart = new Cart();
        tempCart.setUser(user);
        tempCart.setItems(new java.util.ArrayList<>());
        // Mirror the promotion the user selected on their real cart. The payment amount was computed from
        // If the user's saved cart had a coupon or manual promotion, creating the order consumes them,
        // so we clear them to ensure the next cart starts fresh.
        if (email != null) {
            cartRepository.findByUserEmail(email).ifPresent(cart -> {
                tempCart.setManuallySelectedPromotionId(cart.getManuallySelectedPromotionId());
                cart.setCouponCode(null);
                cart.setManuallySelectedPromotionId(null);
                cartRepository.save(cart);
            });
        } else {
            tempCart.setManuallySelectedPromotionId(request.getManuallySelectedPromotionId());
        }
        long tempId = 1;

        // --- Phase 4B N+1 Batching ---
        java.util.Set<Long> variantIds = new java.util.HashSet<>();
        java.util.Set<Long> bottleIds = new java.util.HashSet<>();
        java.util.Set<Long> giftSetIds = new java.util.HashSet<>();
        for (OrderItemRequest req : request.getItems()) {
            if (req.getGiftSetId() != null || req.isGiftSet()) {
                if (req.getGiftSetId() != null) giftSetIds.add(req.getGiftSetId());
            } else {
                if (req.getVariantId() != null) variantIds.add(req.getVariantId());
                if (req.getBottleId() != null) bottleIds.add(req.getBottleId());
            }
        }

        java.util.Map<Long, GiftSet> giftSetMap = giftSetIds.isEmpty() ? java.util.Collections.emptyMap() :
                giftSetRepository.findAllByIdWithItemsEager(giftSetIds).stream()
                        .collect(Collectors.toMap(GiftSet::getId, g -> g));

        // Include any variants required by gift sets into variantIds for single-batch loading
        for (GiftSet gs : giftSetMap.values()) {
            if (gs.getItems() != null) {
                for (GiftSetItem gi : gs.getItems()) {
                    if (gi.getVariant() != null && gi.getVariant().getId() != null) {
                        variantIds.add(gi.getVariant().getId());
                    }
                }
            }
        }

        java.util.Map<Long, ProductVariant> variantMap = variantIds.isEmpty() ? new java.util.HashMap<>() :
                variantRepository.findAllById(variantIds).stream()
                        .collect(Collectors.toMap(ProductVariant::getId, v -> v, (a, b) -> a, java.util.HashMap::new));
        java.util.Map<Long, com.alahadattars.entity.Bottle> bottleMap = bottleIds.isEmpty() ? java.util.Collections.emptyMap() :
                bottleRepository.findAllById(bottleIds).stream()
                .collect(Collectors.toMap(com.alahadattars.entity.Bottle::getId, b -> b));

        // First pass: Add all paid items to the cart
        for (OrderItemRequest itemReq : request.getItems()) {
            if (!itemReq.isFreeItem()) {
                if (itemReq.getGiftSetId() != null || itemReq.isGiftSet()) {
                    GiftSet giftSet = giftSetMap.get(itemReq.getGiftSetId());
                    if (giftSet == null) {
                        giftSet = giftSetRepository.findByIdWithItemsEager(itemReq.getGiftSetId())
                                .orElseThrow(() -> new ResourceNotFoundException("Gift Set not found with id: " + itemReq.getGiftSetId()));
                    }
                    if (!giftSet.isActive()) {
                        throw new BadRequestException("Gift Set " + giftSet.getName() + " is not available.");
                    }
                    if (itemReq.getBottleId() != null) {
                        throw new BadRequestException("Bottle selection is not allowed for Gift Sets.");
                    }
                    BigDecimal livePrice = giftSet.getSalePrice() != null ? giftSet.getSalePrice() : giftSet.getPrice();
                    CartItem ci = new CartItem();
                    ci.setId(tempId++);
                    ci.setCart(tempCart);
                    ci.setIsGiftSet(true);
                    ci.setGiftSet(giftSet);
                    ci.setQuantity(itemReq.getQuantity());
                    ci.setPrice(livePrice);
                    ci.setFreeItem(false);
                    tempCart.addItem(ci);
                } else {
                    ProductVariant variant = java.util.Optional.ofNullable(variantMap.get(itemReq.getVariantId()))
                            .orElseThrow(() -> new ResourceNotFoundException("Variant not found: " + itemReq.getVariantId()));

                    BigDecimal finalPrice = variant.getPrice();
                    com.alahadattars.entity.Bottle bottle = null;
                    if (itemReq.getBottleId() != null) {
                        bottle = java.util.Optional.ofNullable(bottleMap.get(itemReq.getBottleId()))
                                .orElseThrow(() -> new ResourceNotFoundException("Bottle not found: " + itemReq.getBottleId()));
                        if (!bottle.isActive()) {
                            throw new BadRequestException("Selected bottle is not available");
                        }
                        if (bottle.getApplicability() != com.alahadattars.enums.BottleApplicability.BOTH) {
                            if (variant.getProductType() == com.alahadattars.enums.ProductType.ATTAR && bottle.getApplicability() != com.alahadattars.enums.BottleApplicability.ATTAR) {
                                throw new BadRequestException("This bottle is not applicable for Attars.");
                            }
                            if (variant.getProductType() == com.alahadattars.enums.ProductType.PERFUME && bottle.getApplicability() != com.alahadattars.enums.BottleApplicability.PERFUME) {
                                throw new BadRequestException("This bottle is not applicable for Perfumes.");
                            }
                        }
                        finalPrice = finalPrice.add(bottle.getPrice());
                    }

                    boolean isBakhoor = variant.getProduct().getCategory() != null &&
                                        (variant.getProduct().getCategory().getType() == com.alahadattars.enums.CategoryType.BAKHOOR ||
                                         "Bakhoor".equalsIgnoreCase(variant.getProduct().getCategory().getName()));

                    if ((variant.getProductType() == com.alahadattars.enums.ProductType.ATTAR || variant.getProductType() == com.alahadattars.enums.ProductType.PERFUME) && !isBakhoor && bottle == null) {
                        throw new BadRequestException("A bottle must be selected for this fragrance.");
                    }

                    CartItem ci = new CartItem();
                    ci.setId(tempId++);
                    ci.setCart(tempCart);
                    ci.setProduct(variant.getProduct());
                    ci.setVariant(variant);
                    ci.setBottle(bottle);
                    ci.setQuantity(itemReq.getQuantity());
                    ci.setFreeItem(false);
                    ci.setFreePromotionId(null);
                    ci.setPrice(finalPrice);
                    tempCart.addItem(ci);
                }
            }
        }

        // Second pass: Validate and add free items
        for (OrderItemRequest itemReq : request.getItems()) {
            if (itemReq.isFreeItem()) {
                ProductVariant variant = java.util.Optional.ofNullable(variantMap.get(itemReq.getVariantId()))
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

        // Consolidate required variant and bottle units across standalone items and gift set components
        java.util.Map<Long, Integer> consolidatedVariantDeductions = new java.util.LinkedHashMap<>();
        java.util.Map<Long, Integer> consolidatedBottleDeductions = new java.util.LinkedHashMap<>();

        for (CartItemResponse itemRes : cartEval.getItems()) {
            if (itemRes.isGiftSet()) {
                GiftSet gs = giftSetMap.get(itemRes.getGiftSetId());
                if (gs == null) {
                    gs = giftSetRepository.findByIdWithItemsEager(itemRes.getGiftSetId())
                            .orElseThrow(() -> new ResourceNotFoundException("Gift Set not found with id: " + itemRes.getGiftSetId()));
                }
                for (GiftSetItem comp : gs.getItems()) {
                    int unitsNeeded = comp.getQuantity() * itemRes.getQuantity();
                    consolidatedVariantDeductions.merge(comp.getVariant().getId(), unitsNeeded, Integer::sum);
                }
            } else {
                consolidatedVariantDeductions.merge(itemRes.getVariantId(), itemRes.getQuantity(), Integer::sum);
                if (itemRes.getBottle() != null) {
                    consolidatedBottleDeductions.merge(itemRes.getBottle().getId(), itemRes.getQuantity(), Integer::sum);
                }
            }
        }

        // Pre-check stock availability
        java.util.Set<Long> missingVariantIds = consolidatedVariantDeductions.keySet().stream()
                .filter(id -> !variantMap.containsKey(id))
                .collect(Collectors.toSet());
        if (!missingVariantIds.isEmpty()) {
            variantRepository.findAllById(missingVariantIds).forEach(v -> variantMap.put(v.getId(), v));
        }

        for (java.util.Map.Entry<Long, Integer> entry : consolidatedVariantDeductions.entrySet()) {
            Long vId = entry.getKey();
            int needed = entry.getValue();
            ProductVariant v = variantMap.get(vId);
            if (v == null || !v.isActive()) {
                throw new BadRequestException("Required product variant #" + vId + " is no longer available.");
            }
            if (v.getStock() < needed) {
                String pName = v.getProduct() != null ? v.getProduct().getName() : "Variant #" + vId;
                throw new BadRequestException("Insufficient stock for " + pName + " (" + v.getSize() + "). Available: " + v.getStock() + ", Required: " + needed);
            }
        }

        for (java.util.Map.Entry<Long, Integer> entry : consolidatedBottleDeductions.entrySet()) {
            Long bId = entry.getKey();
            int needed = entry.getValue();
            com.alahadattars.entity.Bottle b = bottleMap.get(bId);
            if (b == null) {
                b = bottleRepository.findById(bId).orElseThrow(() -> new ResourceNotFoundException("Bottle not found: " + bId));
            }
            if (!b.isActive()) {
                throw new BadRequestException("Selected bottle " + b.getName() + " is no longer available.");
            }
            if (b.getStockQuantity() < needed) {
                throw new BadRequestException("Insufficient stock for bottle " + b.getName() + ". Available: " + b.getStockQuantity() + ", Required: " + needed);
            }
        }

        // Deadlock-free atomic inventory deductions: sort ascending by ID
        List<Long> sortedVariantIds = consolidatedVariantDeductions.keySet().stream().sorted().toList();
        for (Long vid : sortedVariantIds) {
            int needed = consolidatedVariantDeductions.get(vid);
            if (variantRepository.decrementStock(vid, needed) == 0) {
                ProductVariant v = variantMap.get(vid);
                String pName = (v != null && v.getProduct() != null) ? v.getProduct().getName() + " (" + v.getSize() + ")" : "Variant #" + vid;
                throw new BadRequestException("Insufficient stock for " + pName + ". Stock just changed — please refresh your cart and try again.");
            }
        }

        List<Long> sortedBottleIds = consolidatedBottleDeductions.keySet().stream().sorted().toList();
        for (Long bid : sortedBottleIds) {
            int needed = consolidatedBottleDeductions.get(bid);
            if (bottleRepository.decrementStock(bid, needed) == 0) {
                com.alahadattars.entity.Bottle b = bottleMap.get(bid);
                String bName = b != null ? b.getName() : "Bottle #" + bid;
                throw new BadRequestException("Insufficient stock for bottle " + bName + ". Please refresh your cart and try again.");
            }
        }

        // Build OrderItems
        for (CartItemResponse itemRes : cartEval.getItems()) {
            if (itemRes.isGiftSet()) {
                GiftSet gs = giftSetMap.get(itemRes.getGiftSetId());
                if (gs == null) {
                    gs = giftSetRepository.findByIdWithItemsEager(itemRes.getGiftSetId()).orElseThrow();
                }
                BigDecimal originalPrice = gs.getSalePrice() != null ? gs.getSalePrice() : gs.getPrice();
                BigDecimal unitPrice = itemRes.getFinalPrice();
                BigDecimal discountAmt = itemRes.getDiscountAmount();
                BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(itemRes.getQuantity()));

                // Immutable historical JSON snapshot
                Map<String, Object> snapshotMap = new java.util.LinkedHashMap<>();
                snapshotMap.put("giftSetId", gs.getId());
                snapshotMap.put("giftSetName", gs.getName());
                snapshotMap.put("giftSetSlug", gs.getSlug());
                List<Map<String, Object>> compSnapshots = new ArrayList<>();
                for (GiftSetItem comp : gs.getItems()) {
                    Map<String, Object> compMap = new java.util.LinkedHashMap<>();
                    compMap.put("productId", comp.getProduct().getId());
                    compMap.put("productName", comp.getProduct().getName());
                    compMap.put("variantId", comp.getVariant().getId());
                    compMap.put("variantSize", comp.getVariant().getSize());
                    compMap.put("sku", comp.getVariant().getSku());
                    compMap.put("quantityPerSet", comp.getQuantity());
                    compMap.put("totalDeductedQuantity", comp.getQuantity() * itemRes.getQuantity());
                    compSnapshots.add(compMap);
                }
                snapshotMap.put("components", compSnapshots);
                String snapshotJson;
                try {
                    snapshotJson = objectMapper.writeValueAsString(snapshotMap);
                } catch (Exception e) {
                    log.error("Failed to serialize gift set snapshot for gift set {}", gs.getId(), e);
                    snapshotJson = null;
                }

                OrderItem orderItem = OrderItem.builder()
                        .order(order)
                        .isGiftSet(true)
                        .giftSetId(gs.getId())
                        .giftSetName(gs.getName())
                        .giftSetSnapshot(snapshotJson)
                        .variant(null)
                        .quantity(itemRes.getQuantity())
                        .originalPrice(originalPrice)
                        .discountAmount(discountAmt)
                        .unitPrice(unitPrice)
                        .subtotal(subtotal)
                        .productName(gs.getName())
                        .variantSize(null)
                        .bottleId(null)
                        .bottleName(null)
                        .bottlePrice(null)
                        .freeItem(false)
                        .freePromotionId(null)
                        .build();

                for (GiftSetItem comp : gs.getItems()) {
                    OrderItemGiftSetComponent componentEntity = OrderItemGiftSetComponent.builder()
                            .orderItem(orderItem)
                            .giftSetId(gs.getId())
                            .productId(comp.getProduct().getId())
                            .productName(comp.getProduct().getName())
                            .variantId(comp.getVariant().getId())
                            .variantSize(comp.getVariant().getSize())
                            .sku(comp.getVariant().getSku())
                            .quantityPerSet(comp.getQuantity())
                            .totalDeductedQuantity(comp.getQuantity() * itemRes.getQuantity())
                            .build();
                    orderItem.addGiftSetComponent(componentEntity);
                }

                order.addItem(orderItem);
            } else {
                ProductVariant variant = java.util.Optional.ofNullable(variantMap.get(itemRes.getVariantId()))
                        .orElseGet(() -> variantRepository.findById(itemRes.getVariantId()).orElseThrow());

                boolean isFreeOrderItem = itemRes.isFreeItem();
                BigDecimal originalPrice = variant.getPrice(); // Always store actual market price
                BigDecimal unitPrice = isFreeOrderItem ? BigDecimal.ZERO : itemRes.getFinalPrice();
                BigDecimal discountAmt = isFreeOrderItem
                        ? originalPrice // Entire price is the "discount" for free items
                        : itemRes.getDiscountAmount();
                BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(itemRes.getQuantity()));

                OrderItem orderItem = OrderItem.builder()
                        .order(order)
                        .isGiftSet(false)
                        .giftSetId(null)
                        .giftSetName(null)
                        .giftSetSnapshot(null)
                        .variant(variant)
                        .quantity(itemRes.getQuantity())
                        .originalPrice(originalPrice)
                        .discountAmount(discountAmt)
                        .unitPrice(unitPrice)
                        .subtotal(subtotal)
                        .productName(variant.getProduct().getName())
                        .variantSize(variant.getSize())
                        .bottleId(itemRes.getBottle() != null ? itemRes.getBottle().getId() : null)
                        .bottleName(itemRes.getBottle() != null ? itemRes.getBottle().getName() : null)
                        .bottlePrice(itemRes.getBottle() != null ? itemRes.getBottle().getPrice() : null)
                        .freeItem(isFreeOrderItem)
                        .freePromotionId(isFreeOrderItem ? itemRes.getFreePromotionId() : null)
                        .build();

                order.addItem(orderItem);
            }
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
        Boolean isGiftWrapped = request.getIsGiftWrapped() != null ? request.getIsGiftWrapped() : false;

        if (isGiftWrapped && settings.getIsGiftWrapEnabled()) {
            giftServicePrice = settings.getGiftWrapPrice() != null ? settings.getGiftWrapPrice() : BigDecimal.ZERO;
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
        java.util.Set<Long> recordedPromotionIds = new java.util.HashSet<>();

        if (cartEval.getAppliedPromotions() != null) {
            for (PromotionResponse applied : cartEval.getAppliedPromotions()) {
                if (applied == null || applied.getId() == null) continue;
                recordedPromotionIds.add(applied.getId());

                Promotion promo = promotionRepository.findById(applied.getId()).orElse(null);
                if (promo == null) continue;

                Integer perUserLimit = promo.getPerUserLimit();
                if (perUserLimit != null && perUserLimit > 0) {
                    String customerEmail = (user != null) ? user.getEmail() : request.getGuestEmail();
                    if (customerEmail != null && !customerEmail.isBlank()) {
                        long alreadyUsed = promotionRedemptionRepository
                                .countByPromotionIdAndEmail(promo.getId(), customerEmail);
                        if (alreadyUsed >= perUserLimit) {
                            throw new BadRequestException(
                                    "You have already used the promotion '" + promo.getName() + "'.");
                        }
                    }
                }

                if (promotionRepository.claimRedemption(promo.getId()) == 0) {
                    throw new BadRequestException(
                            "The promotion '" + promo.getName() + "' is no longer available.");
                }

                redemptions.add(PromotionRedemption.builder()
                        .promotion(promo)
                        .user(user)
                        .guestEmail(user == null ? request.getGuestEmail() : null)
                        .build());
            }
        }

        // Ensure FREE_PRODUCT promotions also record a redemption, as they are excluded from appliedPromotions
        if (cartEval.getItems() != null) {
            for (CartItemResponse itemRes : cartEval.getItems()) {
                if (itemRes.isFreeItem() && itemRes.getFreePromotionId() != null) {
                    if (recordedPromotionIds.add(itemRes.getFreePromotionId())) {
                        Promotion promo = promotionRepository.findById(itemRes.getFreePromotionId()).orElse(null);
                        if (promo == null) continue;

                        Integer perUserLimit = promo.getPerUserLimit();
                        if (perUserLimit != null && perUserLimit > 0) {
                            String customerEmail = (user != null) ? user.getEmail() : request.getGuestEmail();
                            if (customerEmail != null && !customerEmail.isBlank()) {
                                long alreadyUsed = promotionRedemptionRepository
                                        .countByPromotionIdAndEmail(promo.getId(), customerEmail);
                                if (alreadyUsed >= perUserLimit) {
                                    throw new BadRequestException(
                                            "You have already used the promotion '" + promo.getName() + "'.");
                                }
                            }
                        }

                        if (promotionRepository.claimRedemption(promo.getId()) == 0) {
                            throw new BadRequestException(
                                    "The promotion '" + promo.getName() + "' is no longer available.");
                        }

                        redemptions.add(PromotionRedemption.builder()
                                .promotion(promo)
                                .user(user)
                                .guestEmail(user == null ? request.getGuestEmail() : null)
                                .build());
                    }
                }
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

        order.setIsGiftWrapped(isGiftWrapped);
        order.setGiftServicePrice(giftServicePrice);
        order.setGiftMessage(request.getGiftMessage());
        order.setTotalAmount(totalAmount);

        Order savedOrder = orderRepository.save(order);

        if (!redemptions.isEmpty()) {
            redemptions.forEach(redemption -> redemption.setOrderId(savedOrder.getId()));
            promotionRedemptionRepository.saveAll(redemptions);
        }

        List<EmailOrderItem> emailItems = toEmailItems(savedOrder.getItems());
        EmailAddress emailAddress = toEmailAddress(savedOrder.getShippingAddress());

        String customerName = user != null ? (user.getFirstName() + " " + user.getLastName()) : savedOrder.getGuestName();
        String customerEmail = user != null ? user.getEmail() : savedOrder.getGuestEmail();
        String customerPhone = user != null ? user.getPhone() : savedOrder.getGuestPhone();

        OrderConfirmationEmailData confirmationData = new OrderConfirmationEmailData(
                customerEmail,
                customerName,
                savedOrder.getOrderNumber(),
                formatEmailDate(savedOrder.getCreatedAt()),
                emailItems,
                emailAddress,
                savedOrder.getTotalAmount(),
                savedOrder.getPaymentMethod()
        );

        AdminNewOrderEmailData adminData = new AdminNewOrderEmailData(
                savedOrder.getOrderNumber(),
                customerName,
                customerPhone,
                emailAddress,
                emailItems,
                savedOrder.getTotalAmount()
        );

        // Decouple external notifications/emails from the database transaction.
        // Dispatched in TransactionPhase.AFTER_COMMIT by OrderNotificationListener so that
        // potential CallerRunsPolicy backpressure never executes SMTP I/O while holding a DB connection.
        eventPublisher.publishEvent(new OrderCreatedEvent(
                savedOrder.getId(),
                savedOrder.getOrderNumber(),
                confirmationData,
                adminData,
                savedOrder
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
    @org.springframework.cache.annotation.CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public OrderResponse cancelOrder(String email, Long orderId) {
        Order order = refundTransactionSupport.claimCancellationAndPrepareRefund(orderId, email);
        sendCancellationEmails(order);
        notificationService.sendOrderCancelledNotification(order);
        return mapToResponse(order);
    }

    /**
     * Admin-initiated cancellation — identical CONFIRMED-only rule and atomic claim as
     * {@link #cancelOrder}, just not restricted to the order's owner.
     */
    @Override
    @org.springframework.cache.annotation.CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public OrderResponse adminCancelOrder(String adminEmail, Long orderId) {
        Order order = refundTransactionSupport.claimAdminCancellation(orderId, adminEmail);
        sendCancellationEmails(order);
        notificationService.sendOrderCancelledNotification(order);
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

        if (result.getOutcome() == RefundResult.RefundOutcome.SUCCESS || result.getOutcome() == RefundResult.RefundOutcome.PROCESSED) {
            log.info("Refund API {} for order {} | Refund ID: {} | Admin: {}", result.getOutcome().name(), savedOrder.getId(), result.getRefundId(), adminEmail);
            // We can notify the customer since Razorpay synchronously confirmed it.
            if (user != null && user.getEmail() != null) {
                emailService.sendRefundSuccessfulEmail(new RefundSuccessfulEmailData(
                        user.getEmail(),
                        customerName,
                        savedOrder.getOrderNumber(),
                        savedOrder.getRefundAmount(),
                        savedOrder.getRefundId(),
                        formatEmailDate(LocalDateTime.now())
                ));
            }
            try {
                notificationService.sendRefundCompletedNotification(savedOrder);
            } catch (Exception e) {
                log.warn("Failed to send refund completion notification for order {}: {}", savedOrder.getId(), e.getMessage());
            }
        } else if (result.getOutcome() == RefundResult.RefundOutcome.UNKNOWN_TIMEOUT) {
            log.warn("Refund API UNKNOWN/TIMEOUT for order {} | Admin: {}. Kept in PROCESSING.", savedOrder.getId(), adminEmail);
            // Do not send success or failure emails. Wait for webhook or manual reconciliation.
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
                .isGiftWrapped(order.getIsGiftWrapped())
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
        if (variant == null || variant.getProduct() == null) return null;
        String preferredType = variant.getProductType() != null ? variant.getProductType().name() : null;
        return productImageResolver.resolveImage(variant.getProduct().getImages(), preferredType);
    }

    private String resolveGiftSetOrderItemImage(Long giftSetId) {
        if (giftSetId == null) return null;
        return giftSetRepository.findById(giftSetId)
                .map(gs -> {
                    if (gs.getImages() == null || gs.getImages().isEmpty()) return null;
                    return gs.getImages().stream()
                            .filter(GiftSetImage::isActive)
                            .filter(GiftSetImage::isPrimary)
                            .findFirst()
                            .map(img -> storageService.resolveUrl(img.getImageUrl(), "/api/gift-sets/images/" + img.getId() + "/file"))
                            .orElseGet(() -> storageService.resolveUrl(gs.getImages().get(0).getImageUrl(), "/api/gift-sets/images/" + gs.getImages().get(0).getId() + "/file"));
                })
                .orElse(null);
    }

    private OrderItemResponse mapItemToResponse(OrderItem item) {
        if (item.isGiftSet()) {
            List<OrderItemGiftSetComponentResponse> components = null;
            if (item.getGiftSetComponents() != null && !item.getGiftSetComponents().isEmpty()) {
                components = item.getGiftSetComponents().stream()
                        .map(OrderItemGiftSetComponentResponse::fromEntity)
                        .collect(Collectors.toList());
            } else if (item.getId() != null) {
                components = orderItemGiftSetComponentRepository.findByOrderItemId(item.getId()).stream()
                        .map(OrderItemGiftSetComponentResponse::fromEntity)
                        .collect(Collectors.toList());
            }

            return OrderItemResponse.builder()
                    .id(item.getId())
                    .isGiftSet(true)
                    .giftSetId(item.getGiftSetId())
                    .giftSetName(item.getGiftSetName())
                    .giftSetSnapshot(item.getGiftSetSnapshot())
                    .giftSetComponents(components)
                    .variant(null)
                    .productName(item.getGiftSetName() != null ? item.getGiftSetName() : item.getProductName())
                    .variantSize(null)
                    .productImage(resolveGiftSetOrderItemImage(item.getGiftSetId()))
                    .quantity(item.getQuantity())
                    .originalPrice(item.getOriginalPrice())
                    .discountAmount(item.getDiscountAmount())
                    .unitPrice(item.getUnitPrice())
                    .subtotal(item.getSubtotal())
                    .bottleId(null)
                    .bottleName(null)
                    .bottlePrice(null)
                    .build();
        }

        return OrderItemResponse.builder()
                .id(item.getId())
                .isGiftSet(false)
                .variant(item.getVariant() != null ? variantMapper.toResponse(item.getVariant()) : null)
                .quantity(item.getQuantity())
                .originalPrice(item.getOriginalPrice())
                .discountAmount(item.getDiscountAmount())
                .unitPrice(item.getUnitPrice())
                .subtotal(item.getSubtotal())
                .productName(item.getProductName())
                .variantSize(item.getVariantSize())
                .productImage(resolveOrderItemImage(item.getVariant()))
                .bottleId(item.getBottleId())
                .bottleName(item.getBottleName())
                .bottlePrice(item.getBottlePrice())
                .build();
    }
}
