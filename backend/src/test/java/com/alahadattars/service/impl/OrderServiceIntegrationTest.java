package com.alahadattars.service.impl;

import com.alahadattars.dto.order.OrderItemRequest;
import com.alahadattars.dto.order.OrderRequest;
import com.alahadattars.entity.Address;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Order;
import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.entity.User;
import com.alahadattars.enums.PromotionType;
import com.alahadattars.enums.RoleType;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.repository.AddressRepository;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.repository.RoleRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.service.OrderService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class OrderServiceIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AddressRepository addressRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private PaymentIntentRepository paymentIntentRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @MockBean
    private com.alahadattars.service.PaymentService paymentService;

    private User testUser;
    private Address testAddress;
    private ProductVariant paidVariant;
    private ProductVariant freeVariant;
    private Promotion freePromotion;

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.when(paymentService.verifyPayment(org.mockito.ArgumentMatchers.any())).thenReturn(true);

        com.alahadattars.entity.Role testRole = roleRepository.findByName(RoleType.USER).orElseGet(() -> {
            com.alahadattars.entity.Role r = new com.alahadattars.entity.Role();
            r.setName(RoleType.USER);
            r.setDescription("User");
            r.setActive(true);
            return roleRepository.save(r);
        });

        testUser = User.builder()
                .email("test@example.com")
                .phone("1234567890")
                .password("password")
                .firstName("Test")
                .lastName("User")
                .role(testRole)
                .build();
        userRepository.save(testUser);

        testAddress = Address.builder()
                .user(testUser)
                .fullName("Test User")
                .addressLine1("123 Street")
                .city("City")
                .state("State")
                .postalCode("123456")
                .phone("1234567890")
                .country("India")
                .build();
        addressRepository.save(testAddress);

        Category category = Category.builder()
                .name("Attar")
                .description("Attars")
                .image("attar.jpg")
                .type(com.alahadattars.enums.CategoryType.ATTARS)
                .build();
        categoryRepository.save(category);

        Product product = Product.builder()
                .name("Oud")
                .slug("oud-test-1")
                .brand("Brand")
                .category(category)
                .description("Desc")
                .fragranceFamily("Woody")
                .topNotes("x").middleNotes("y").baseNotes("z")
                .longevity("long").projection("strong").gender(com.alahadattars.enums.Gender.UNISEX).shortDescription("short")
                .build();
        productRepository.save(product);

        paidVariant = ProductVariant.builder()
                .product(product)
                .size("12 ml")
                .price(new BigDecimal("1000"))
                .stock(10)
                .active(true)
                .sku("OUD-12")
                .productType(com.alahadattars.enums.ProductType.ATTAR)
                .image("img.jpg")
                .build();
        productVariantRepository.save(paidVariant);

        freeVariant = ProductVariant.builder()
                .product(product)
                .size("3 ml")
                .price(new BigDecimal("300"))
                .stock(5)
                .active(true)
                .sku("OUD-3")
                .productType(com.alahadattars.enums.ProductType.ATTAR)
                .image("img.jpg")
                .build();
        productVariantRepository.save(freeVariant);

        freePromotion = new Promotion();
        freePromotion.setName("Free Gift Test");
        freePromotion.setPromotionType(PromotionType.FREE_PRODUCT);
        freePromotion.setActive(true);
        freePromotion.setDiscountType(com.alahadattars.enums.DiscountType.FREE_ITEM);
        freePromotion.setPriority(1);
        PromotionConfiguration config = new PromotionConfiguration();
        config.setFreeCategoryIds(List.of(category.getId()));
        config.setAllowedFreeVariantSize("3 ml");
        freePromotion.setConfiguration(config);
        promotionRepository.save(freePromotion);
    }

    /**
     * createOrder requires a PaymentIntent row (bound to the same razorpayOrderId the request
     * carries) proving this exact amount was actually asked of Razorpay — persists one and wires
     * the matching fields onto the request so checkout reaches the code under test instead of
     * failing at "Unknown payment reference" (OrderServiceImpl.java ~line 115).
     */
    private void attachPaymentIntent(OrderRequest orderRequest, String razorpayOrderId, BigDecimal amount) {
        PaymentIntent intent = PaymentIntent.builder()
                .razorpayOrderId(razorpayOrderId)
                .user(testUser)
                .amount(amount)
                .consumed(false)
                .build();
        paymentIntentRepository.save(intent);
        orderRequest.setRazorpayOrderId(razorpayOrderId);
        orderRequest.setRazorpayPaymentId("pay_" + razorpayOrderId);
        orderRequest.setRazorpaySignature("sig_" + razorpayOrderId);
    }

    @Test
    void testCheckoutWithValidFreeProduct() {
        // Buy 1 paid item and claim 1 free item
        OrderItemRequest paidReq = new OrderItemRequest();
        paidReq.setVariantId(paidVariant.getId());
        paidReq.setQuantity(1);
        paidReq.setFreeItem(false);

        OrderItemRequest freeReq = new OrderItemRequest();
        freeReq.setVariantId(freeVariant.getId());
        freeReq.setQuantity(1);
        freeReq.setFreeItem(true);
        freeReq.setFreePromotionId(freePromotion.getId());

        OrderRequest orderRequest = new OrderRequest();
        orderRequest.setShippingAddressId(testAddress.getId());
        orderRequest.setItems(List.of(paidReq, freeReq));
        // Paid 1000 + free 0 = 1000 total; must exactly match what the "Razorpay" charge was for.
        attachPaymentIntent(orderRequest, "order_valid_test", new BigDecimal("1000.00"));

        // Attempt checkout
        var response = orderService.createOrder(testUser.getEmail(), orderRequest);

        // decrementStock is a bulk @Modifying JPQL UPDATE — it doesn't sync back into this
        // @Transactional test's persistence context, so paidVariant/freeVariant (already loaded
        // in @BeforeEach) would otherwise be re-fetched from the session's first-level cache
        // showing their pre-decrement values instead of hitting the DB.
        entityManager.clear();

        assertNotNull(response);
        assertEquals(2, response.getItems().size());

        // Find the saved order
        Order order = orderRepository.findByOrderNumber(response.getOrderNumber()).orElseThrow();
        assertEquals(0, new BigDecimal("1000").compareTo(order.getTotalAmount())); // Paid 1000 for variant, free item should be 0
        
        // Verify inventory deducted
        ProductVariant updatedPaid = productVariantRepository.findById(paidVariant.getId()).orElseThrow();
        assertEquals(9, updatedPaid.getStock());

        ProductVariant updatedFree = productVariantRepository.findById(freeVariant.getId()).orElseThrow();
        assertEquals(4, updatedFree.getStock());
    }

    @Test
    void cancellation_restoresBothPaidAndFreeInventory_refundAmountExcludesGiftValue() {
        OrderItemRequest paidReq = new OrderItemRequest();
        paidReq.setVariantId(paidVariant.getId());
        paidReq.setQuantity(1);
        paidReq.setFreeItem(false);

        OrderItemRequest freeReq = new OrderItemRequest();
        freeReq.setVariantId(freeVariant.getId());
        freeReq.setQuantity(1);
        freeReq.setFreeItem(true);
        freeReq.setFreePromotionId(freePromotion.getId());

        OrderRequest orderRequest = new OrderRequest();
        orderRequest.setShippingAddressId(testAddress.getId());
        orderRequest.setItems(List.of(paidReq, freeReq));
        attachPaymentIntent(orderRequest, "order_cancel_test", new BigDecimal("1000.00"));

        var response = orderService.createOrder(testUser.getEmail(), orderRequest);
        entityManager.clear();

        orderService.cancelOrder(testUser.getEmail(), response.getId());
        // Unlike the stock changes above (bulk @Modifying queries, which execute immediately),
        // status/refundStatus are set via normal entity dirty-checking + save() on an
        // already-persisted row — deferred until an actual flush. Nested @Transactional calls
        // inside this test's outer transaction don't independently commit, so clear() alone would
        // silently discard the pending change before it ever reaches the DB.
        entityManager.flush();
        entityManager.clear();

        // Both paid (12ml, stock 10 -> 9 after checkout) and free (3ml, stock 5 -> 4 after
        // checkout) variants must be restored to their pre-checkout stock exactly once.
        ProductVariant restoredPaid = productVariantRepository.findById(paidVariant.getId()).orElseThrow();
        assertEquals(10, restoredPaid.getStock());
        ProductVariant restoredFree = productVariantRepository.findById(freeVariant.getId()).orElseThrow();
        assertEquals(5, restoredFree.getStock());

        // Refund amount must reflect only the paid subtotal (1000) — never the free item's ₹300
        // retail value, since it was never actually charged.
        Order cancelled = orderRepository.findByOrderNumber(response.getOrderNumber()).orElseThrow();
        assertEquals(com.alahadattars.enums.OrderStatus.CANCELLED, cancelled.getStatus());
        assertEquals(com.alahadattars.enums.RefundStatus.REFUND_REQUIRED, cancelled.getRefundStatus());
        assertEquals(0, new BigDecimal("1000.00").compareTo(cancelled.getRefundAmount()));
    }

    @Test
    void testCheckoutWithFraudulentFreeProduct_ThrowsException() {
        // Attempt to claim a free item without adding the qualifying product
        // Or manipulate the variant ID to something unauthorized (e.g. 12 ml)
        OrderItemRequest paidReq = new OrderItemRequest();
        paidReq.setVariantId(paidVariant.getId());
        paidReq.setQuantity(1);
        paidReq.setFreeItem(false);

        OrderItemRequest fraudulentFreeReq = new OrderItemRequest();
        fraudulentFreeReq.setVariantId(paidVariant.getId()); // Claiming the expensive one for free
        fraudulentFreeReq.setQuantity(1);
        fraudulentFreeReq.setFreeItem(true);
        fraudulentFreeReq.setFreePromotionId(freePromotion.getId());

        OrderRequest orderRequest = new OrderRequest();
        orderRequest.setShippingAddressId(testAddress.getId());
        orderRequest.setItems(List.of(paidReq, fraudulentFreeReq));
        attachPaymentIntent(orderRequest, "order_fraud_test", new BigDecimal("1000.00"));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> {
            orderService.createOrder(testUser.getEmail(), orderRequest);
        });

        assertTrue(ex.getMessage().contains("not eligible"));
    }
}
