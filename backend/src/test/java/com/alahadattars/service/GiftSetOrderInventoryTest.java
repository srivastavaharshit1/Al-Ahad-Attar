package com.alahadattars.service;

import com.alahadattars.dto.cart.CartItemResponse;
import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.dto.order.OrderItemRequest;
import com.alahadattars.dto.order.OrderItemResponse;
import com.alahadattars.dto.order.OrderRequest;
import com.alahadattars.dto.order.OrderResponse;
import com.alahadattars.entity.Address;
import com.alahadattars.entity.AdminNotification;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.GiftSet;
import com.alahadattars.entity.GiftSetItem;
import com.alahadattars.entity.Order;
import com.alahadattars.entity.OrderItem;
import com.alahadattars.entity.OrderItemGiftSetComponent;
import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.StoreSettings;
import com.alahadattars.entity.User;
import com.alahadattars.enums.OrderStatus;
import com.alahadattars.enums.PaymentStatus;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.mapper.ProductVariantMapper;
import com.alahadattars.repository.AddressRepository;
import com.alahadattars.repository.AdminNotificationRepository;
import com.alahadattars.repository.BottleRepository;
import com.alahadattars.repository.CartRepository;
import com.alahadattars.repository.GiftSetRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.OrderItemGiftSetComponentRepository;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRedemptionRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.repository.RefundRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.repository.WebhookEventRepository;
import com.alahadattars.service.impl.OrderServiceImpl;
import com.alahadattars.service.impl.RefundTransactionSupport;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Gift Set Order Lifecycle & Aggregated Inventory Tests")
class GiftSetOrderInventoryTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AddressRepository addressRepository;
    @Mock
    private ProductVariantRepository variantRepository;
    @Mock
    private ProductVariantMapper variantMapper;
    @Mock
    private StoreSettingsService storeSettingsService;
    @Mock
    private com.alahadattars.service.notification.NotificationService notificationService;
    @Mock
    private PaymentService paymentService;
    @Mock
    private PromotionEngineService promotionEngineService;
    @Mock
    private PaymentIntentRepository paymentIntentRepository;
    @Mock
    private CartRepository cartRepository;
    @Mock
    private PromotionRepository promotionRepository;
    @Mock
    private PromotionRedemptionRepository promotionRedemptionRepository;
    @Mock
    private EmailService emailService;
    @Mock
    private RefundTransactionSupport refundTransactionSupport;
    @Mock
    private BottleRepository bottleRepository;
    @Mock
    private StorageService storageService;
    @Mock
    private ProductImageResolver productImageResolver;
    @Mock
    private WebhookEventRepository webhookEventRepository;
    @Mock
    private GuestCheckoutLockService guestCheckoutLockService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private GiftSetRepository giftSetRepository;
    @Mock
    private GiftSetService giftSetService;
    @Mock
    private OrderItemGiftSetComponentRepository orderItemGiftSetComponentRepository;

    private ObjectMapper objectMapper;
    private OrderServiceImpl orderService;

    private User testUser;
    private Address testAddress;
    private ProductVariant oud12ml;
    private ProductVariant musk6ml;
    private GiftSet royalOudSet;
    private PaymentIntent paymentIntent;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        orderService = new OrderServiceImpl(
                orderRepository,
                userRepository,
                addressRepository,
                variantRepository,
                variantMapper,
                storeSettingsService,
                notificationService,
                paymentService,
                promotionEngineService,
                objectMapper,
                paymentIntentRepository,
                cartRepository,
                promotionRepository,
                promotionRedemptionRepository,
                emailService,
                refundTransactionSupport,
                bottleRepository,
                storageService,
                productImageResolver,
                webhookEventRepository,
                guestCheckoutLockService,
                eventPublisher,
                giftSetRepository,
                giftSetService,
                orderItemGiftSetComponentRepository
        );

        testUser = User.builder().email("customer@alahadattars.com").firstName("Zayd").lastName("Hassan").build();
        testUser.setId(101L);

        testAddress = Address.builder().fullName("Zayd Hassan").phone("9876543210").addressLine1("123 Fragrance Lane").city("Mumbai").state("Maharashtra").postalCode("400001").country("India").active(true).build();
        testAddress.setId(201L);

        Product oudProduct = Product.builder().name("Royal Oud").build();
        oudProduct.setId(1L);
        oud12ml = ProductVariant.builder().product(oudProduct).size("12ml").price(new BigDecimal("1500.00")).stock(10).active(true).build();
        oud12ml.setId(11L);

        Product muskProduct = Product.builder().name("White Musk").build();
        muskProduct.setId(2L);
        musk6ml = ProductVariant.builder().product(muskProduct).size("6ml").price(new BigDecimal("800.00")).stock(10).active(true).build();
        musk6ml.setId(12L);

        royalOudSet = GiftSet.builder().name("Royal Oud & Musk Collection").slug("royal-oud-musk-collection").price(new BigDecimal("3500.00")).salePrice(new BigDecimal("3199.00")).active(true).items(new ArrayList<>()).build();
        royalOudSet.setId(301L);

        GiftSetItem comp1 = GiftSetItem.builder().giftSet(royalOudSet).product(oudProduct).variant(oud12ml).quantity(1).build();
        GiftSetItem comp2 = GiftSetItem.builder().giftSet(royalOudSet).product(muskProduct).variant(musk6ml).quantity(2).build();
        royalOudSet.getItems().add(comp1);
        royalOudSet.getItems().add(comp2);

        paymentIntent = PaymentIntent.builder().razorpayOrderId("order_dev_12345").amount(new BigDecimal("7898.00")).user(testUser).consumed(false).build();
        paymentIntent.setId(401L);
    }

    @Nested
    @DisplayName("Aggregated Inventory Checkout Tests")
    class AggregatedInventoryCheckoutTests {

        @Test
        @DisplayName("Order containing 1 standalone Oud (1 unit) + 2 Royal Oud Collections (1 Oud each) deducts exactly 3 units of Oud")
        void createOrder_AggregatedDeduction_Success() {
            // Cart total: 1 * 1500 + 2 * 3199 = 1500 + 6398 = 7898. Free shipping threshold: 500 => Total 7898.
            OrderRequest request = OrderRequest.builder()
                    .shippingAddressId(201L)
                    .razorpayOrderId("order_dev_12345")
                    .razorpayPaymentId("pay_dev_99999")
                    .razorpaySignature("dev_signature")
                    .items(List.of(
                            OrderItemRequest.builder().variantId(11L).quantity(1).build(),
                            OrderItemRequest.builder().giftSetId(301L).isGiftSet(true).quantity(2).build()
                    ))
                    .build();

            when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
            when(addressRepository.findByIdAndUserAndActiveTrue(201L, testUser)).thenReturn(Optional.of(testAddress));
            when(paymentService.verifyPayment(any())).thenReturn(true);
            when(paymentIntentRepository.findByRazorpayOrderIdForUpdate("order_dev_12345")).thenReturn(Optional.of(paymentIntent));
            when(orderRepository.existsByTransactionId("pay_dev_99999")).thenReturn(false);
            when(giftSetRepository.findAllByIdWithItemsEager(any())).thenReturn(List.of(royalOudSet));
            when(variantRepository.findAllById(any())).thenReturn(List.of(oud12ml, musk6ml));
            when(storeSettingsService.getSettingsEntity()).thenReturn(StoreSettings.builder().freeShippingThreshold(new BigDecimal("500")).shippingCharge(new BigDecimal("50")).isGiftWrapEnabled(false).build());

            // Cart evaluation stub
            CartResponse eval = CartResponse.builder()
                    .subtotal(new BigDecimal("7898.00"))
                    .itemDiscounts(BigDecimal.ZERO)
                    .cartDiscount(BigDecimal.ZERO)
                    .total(new BigDecimal("7898.00"))
                    .appliedPromotions(new ArrayList<>())
                    .items(List.of(
                            CartItemResponse.builder().variantId(11L).quantity(1).originalPrice(new BigDecimal("1500.00")).finalPrice(new BigDecimal("1500.00")).discountAmount(BigDecimal.ZERO).build(),
                            CartItemResponse.builder().isGiftSet(true).giftSetId(301L).name("Royal Oud & Musk Collection").quantity(2).originalPrice(new BigDecimal("3199.00")).finalPrice(new BigDecimal("3199.00")).discountAmount(BigDecimal.ZERO).build()
                    ))
                    .build();
            when(promotionEngineService.evaluateCart(any(Cart.class), any())).thenReturn(eval);

            when(paymentIntentRepository.markConsumed(eq(401L), eq("pay_dev_99999"), any())).thenReturn(1);
            when(variantRepository.decrementStock(11L, 3)).thenReturn(1); // 1 standalone + (2 sets * 1) = 3 units
            when(variantRepository.decrementStock(12L, 4)).thenReturn(1); // 2 sets * 2 = 4 units

            when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
                Order o = invocation.getArgument(0);
                o.setId(901L);
                return o;
            });

            OrderResponse response = orderService.createOrder(testUser.getEmail(), request);

            // Verify aggregated atomic deductions
            verify(variantRepository).decrementStock(11L, 3);
            verify(variantRepository).decrementStock(12L, 4);

            // Verify deterministic sorting: ID 11 must be decremented BEFORE ID 12
            InOrder inOrder = Mockito.inOrder(variantRepository);
            inOrder.verify(variantRepository).decrementStock(11L, 3);
            inOrder.verify(variantRepository).decrementStock(12L, 4);

            // Verify OrderItems saved
            ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
            verify(orderRepository).save(orderCaptor.capture());
            Order savedOrder = orderCaptor.getValue();
            assertThat(savedOrder.getItems()).hasSize(2);

            OrderItem standardItem = savedOrder.getItems().stream().filter(i -> !i.isGiftSet()).findFirst().orElseThrow();
            assertThat(standardItem.getVariant().getId()).isEqualTo(11L);
            assertThat(standardItem.getQuantity()).isEqualTo(1);

            OrderItem giftSetItem = savedOrder.getItems().stream().filter(OrderItem::isGiftSet).findFirst().orElseThrow();
            assertThat(giftSetItem.getGiftSetId()).isEqualTo(301L);
            assertThat(giftSetItem.getGiftSetName()).isEqualTo("Royal Oud & Musk Collection");
            assertThat(giftSetItem.getVariant()).isNull();
            assertThat(giftSetItem.getQuantity()).isEqualTo(2);
            assertThat(giftSetItem.getGiftSetSnapshot()).isNotNull();
            assertThat(giftSetItem.getGiftSetSnapshot()).contains("Royal Oud & Musk Collection");
            assertThat(giftSetItem.getGiftSetSnapshot()).contains("totalDeductedQuantity\":4"); // 2 * 2 musk

            // Verify historical snapshot component entities
            assertThat(giftSetItem.getGiftSetComponents()).hasSize(2);
            OrderItemGiftSetComponent oudComp = giftSetItem.getGiftSetComponents().stream().filter(c -> c.getVariantId().equals(11L)).findFirst().orElseThrow();
            assertThat(oudComp.getQuantityPerSet()).isEqualTo(1);
            assertThat(oudComp.getTotalDeductedQuantity()).isEqualTo(2);

            OrderItemGiftSetComponent muskComp = giftSetItem.getGiftSetComponents().stream().filter(c -> c.getVariantId().equals(12L)).findFirst().orElseThrow();
            assertThat(muskComp.getQuantityPerSet()).isEqualTo(2);
            assertThat(muskComp.getTotalDeductedQuantity()).isEqualTo(4);
        }

        @Test
        @DisplayName("Order creation fails and rolls back when aggregated component stock is insufficient")
        void createOrder_InsufficientAggregatedStock_Rollback() {
            // Variant 11 (Oud) has stock 2, but order needs 3 (1 standalone + 2 sets)
            oud12ml.setStock(2);

            OrderRequest request = OrderRequest.builder()
                    .shippingAddressId(201L)
                    .razorpayOrderId("order_dev_12345")
                    .razorpayPaymentId("pay_dev_99999")
                    .razorpaySignature("dev_signature")
                    .items(List.of(
                            OrderItemRequest.builder().variantId(11L).quantity(1).build(),
                            OrderItemRequest.builder().giftSetId(301L).isGiftSet(true).quantity(2).build()
                    ))
                    .build();

            when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
            when(addressRepository.findByIdAndUserAndActiveTrue(201L, testUser)).thenReturn(Optional.of(testAddress));
            when(paymentService.verifyPayment(any())).thenReturn(true);
            when(paymentIntentRepository.findByRazorpayOrderIdForUpdate("order_dev_12345")).thenReturn(Optional.of(paymentIntent));
            when(orderRepository.existsByTransactionId("pay_dev_99999")).thenReturn(false);
            when(giftSetRepository.findAllByIdWithItemsEager(any())).thenReturn(List.of(royalOudSet));
            when(variantRepository.findAllById(any())).thenReturn(List.of(oud12ml, musk6ml));

            CartResponse eval = CartResponse.builder()
                    .subtotal(new BigDecimal("7898.00"))
                    .itemDiscounts(BigDecimal.ZERO)
                    .cartDiscount(BigDecimal.ZERO)
                    .total(new BigDecimal("7898.00"))
                    .appliedPromotions(new ArrayList<>())
                    .items(List.of(
                            CartItemResponse.builder().variantId(11L).quantity(1).build(),
                            CartItemResponse.builder().isGiftSet(true).giftSetId(301L).quantity(2).build()
                    ))
                    .build();
            when(promotionEngineService.evaluateCart(any(Cart.class), any())).thenReturn(eval);

            assertThatThrownBy(() -> orderService.createOrder(testUser.getEmail(), request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Insufficient stock for Royal Oud (12ml). Available: 2, Required: 3");

            // Zero stock decrements occurred
            verify(variantRepository, never()).decrementStock(anyLong(), anyInt());
            verify(orderRepository, never()).save(any(Order.class));
        }
    }

    @Nested
    @DisplayName("Cancellation & Inventory Restoration Tests")
    class CancellationAndRestorationTests {

        @Test
        @DisplayName("Cancellation of confirmed Gift Set order restores exact deducted quantities for all components")
        void cancelOrder_FullRestoration_Success() {
            RefundRepository refundRepository = Mockito.mock(RefundRepository.class);
            BottleRepository bottleRepo = Mockito.mock(BottleRepository.class);
            OrderItemGiftSetComponentRepository componentRepo = Mockito.mock(OrderItemGiftSetComponentRepository.class);
            AdminNotificationRepository adminNotificationRepo = Mockito.mock(AdminNotificationRepository.class);

            RefundTransactionSupport refundSupport = new RefundTransactionSupport(
                    orderRepository,
                    refundRepository,
                    variantRepository,
                    bottleRepo,
                    componentRepo,
                    adminNotificationRepo
            );

            Order order = Order.builder()
                    .orderNumber("ORD-GIFTSET-1")
                    .status(OrderStatus.CONFIRMED)
                    .paymentStatus(PaymentStatus.PAID)
                    .totalAmount(new BigDecimal("6398.00"))
                    .items(new ArrayList<>())
                    .build();
            order.setId(888L);

            OrderItem gsOrderItem = OrderItem.builder()
                    .order(order)
                    .isGiftSet(true)
                    .giftSetId(301L)
                    .giftSetName("Royal Oud & Musk Collection")
                    .quantity(2)
                    .build();
            gsOrderItem.setId(777L);

            OrderItemGiftSetComponent c1 = OrderItemGiftSetComponent.builder()
                    .orderItem(gsOrderItem)
                    .variantId(11L)
                    .productName("Royal Oud")
                    .variantSize("12ml")
                    .totalDeductedQuantity(2)
                    .build();
            OrderItemGiftSetComponent c2 = OrderItemGiftSetComponent.builder()
                    .orderItem(gsOrderItem)
                    .variantId(12L)
                    .productName("White Musk")
                    .variantSize("6ml")
                    .totalDeductedQuantity(4)
                    .build();
            gsOrderItem.getGiftSetComponents().add(c1);
            gsOrderItem.getGiftSetComponents().add(c2);
            order.getItems().add(gsOrderItem);

            when(orderRepository.findByIdAndUserEmail(888L, "customer@alahadattars.com")).thenReturn(Optional.of(order));
            when(orderRepository.claimCancellation(888L)).thenReturn(1);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

            when(variantRepository.incrementStock(11L, 2)).thenReturn(1);
            when(variantRepository.incrementStock(12L, 4)).thenReturn(1);

            Order cancelled = refundSupport.claimCancellationAndPrepareRefund(888L, "customer@alahadattars.com");

            assertThat(cancelled.getStatus()).isEqualTo(OrderStatus.CANCELLED);
            verify(variantRepository).incrementStock(11L, 2);
            verify(variantRepository).incrementStock(12L, 4);
            verify(adminNotificationRepo, never()).save(any());
        }

        @Test
        @DisplayName("Cancellation records durable AdminNotification anomaly if a component variant no longer exists")
        void cancelOrder_MissingVariant_RecordsAnomalyNotification() {
            RefundRepository refundRepository = Mockito.mock(RefundRepository.class);
            BottleRepository bottleRepo = Mockito.mock(BottleRepository.class);
            OrderItemGiftSetComponentRepository componentRepo = Mockito.mock(OrderItemGiftSetComponentRepository.class);
            AdminNotificationRepository adminNotificationRepo = Mockito.mock(AdminNotificationRepository.class);

            RefundTransactionSupport refundSupport = new RefundTransactionSupport(
                    orderRepository,
                    refundRepository,
                    variantRepository,
                    bottleRepo,
                    componentRepo,
                    adminNotificationRepo
            );

            Order order = Order.builder()
                    .orderNumber("ORD-GIFTSET-ANOMALY")
                    .status(OrderStatus.CONFIRMED)
                    .paymentStatus(PaymentStatus.PAID)
                    .totalAmount(new BigDecimal("3199.00"))
                    .items(new ArrayList<>())
                    .build();
            order.setId(889L);

            OrderItem gsOrderItem = OrderItem.builder()
                    .order(order)
                    .isGiftSet(true)
                    .giftSetId(301L)
                    .giftSetName("Royal Oud & Musk Collection")
                    .quantity(1)
                    .build();
            gsOrderItem.setId(778L);

            // Component 9999L is missing in database
            OrderItemGiftSetComponent missingComp = OrderItemGiftSetComponent.builder()
                    .orderItem(gsOrderItem)
                    .variantId(9999L)
                    .productName("Deleted Attar")
                    .variantSize("3ml")
                    .totalDeductedQuantity(1)
                    .build();
            gsOrderItem.getGiftSetComponents().add(missingComp);
            order.getItems().add(gsOrderItem);

            when(orderRepository.findByIdAndUserEmail(889L, "customer@alahadattars.com")).thenReturn(Optional.of(order));
            when(orderRepository.claimCancellation(889L)).thenReturn(1);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

            // Variant 9999L returns 0 rows updated
            when(variantRepository.incrementStock(9999L, 1)).thenReturn(0);

            Order cancelled = refundSupport.claimCancellationAndPrepareRefund(889L, "customer@alahadattars.com");

            assertThat(cancelled.getStatus()).isEqualTo(OrderStatus.CANCELLED);

            // Anomaly notification must be persisted!
            ArgumentCaptor<AdminNotification> notifCaptor = ArgumentCaptor.forClass(AdminNotification.class);
            verify(adminNotificationRepo).save(notifCaptor.capture());
            AdminNotification notif = notifCaptor.getValue();
            assertThat(notif.getType()).isEqualTo("INVENTORY_RESTORATION_ANOMALY");
            assertThat(notif.getOrderId()).isEqualTo(889L);
            assertThat(notif.getMessage()).contains("Component variant ID 9999");
            assertThat(notif.getMessage()).contains("Deleted Attar - 3ml");
        }
    }
}

