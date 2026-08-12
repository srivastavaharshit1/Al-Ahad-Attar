package com.alahadattars.service.impl;

import com.alahadattars.dto.payment.RefundResult;
import com.alahadattars.entity.Address;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Order;
import com.alahadattars.entity.OrderItem;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Role;
import com.alahadattars.entity.User;
import com.alahadattars.enums.CategoryType;
import com.alahadattars.enums.Gender;
import com.alahadattars.enums.OrderStatus;
import com.alahadattars.enums.PaymentStatus;
import com.alahadattars.enums.ProductType;
import com.alahadattars.enums.RoleType;
import com.alahadattars.repository.AddressRepository;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.RoleRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.service.OrderService;
import com.alahadattars.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Real multi-threaded concurrency coverage for the money-critical races the cancellation/refund
 * policy explicitly calls out: a customer cancelling at the same instant an admin marks the order
 * packed (PACKED is the cancellation cutoff for every actor), double-cancellation (double-click,
 * two tabs), and two simultaneous admin refund requests for the same order. Deliberately NOT
 * {@code @Transactional} at the class level — see PromotionConcurrencyTest, whose established
 * pattern this mirrors — a transactional test wraps everything in one connection/transaction,
 * which would defeat testing real concurrent commits.
 */
@SpringBootTest
@ActiveProfiles("test")
class OrderCancellationConcurrencyTest {

    @Autowired private OrderService orderService;
    @Autowired private OrderRepository orderRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private AddressRepository addressRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private ProductVariantRepository productVariantRepository;

    @MockBean
    private PaymentService paymentService;

    private User testUser;
    private Address testAddress;
    private ProductVariant variant;

    @BeforeEach
    void setUp() {
        Role role = roleRepository.findByName(RoleType.USER).orElseGet(() -> {
            Role r = new Role();
            r.setName(RoleType.USER);
            r.setDescription("User");
            r.setActive(true);
            return roleRepository.save(r);
        });

        // Must be a genuinely valid, unique-per-run E.164 number: users.phone has a unique index,
        // and this H2 instance (DB_CLOSE_DELAY=-1) is shared across every @Test in this class, not
        // reset between them — a fixed literal here collides on the second test method.
        String uniquePhone = "+9198765" + String.format("%05d", Math.abs(UUID.randomUUID().hashCode()) % 100000);
        testUser = userRepository.save(User.builder()
                .email("cancel-concurrency-" + UUID.randomUUID() + "@example.com")
                .phone(uniquePhone).password("pwd").firstName("C").lastName("U").role(role).build());
        testAddress = addressRepository.save(Address.builder().user(testUser).fullName("C U")
                .addressLine1("123").city("C").state("S").postalCode("123").phone(uniquePhone).country("India").build());
        Category category = categoryRepository.save(Category.builder().name("Cat-" + UUID.randomUUID())
                .description("desc").image("img").type(CategoryType.ATTARS).build());
        Product product = productRepository.save(Product.builder().name("P").slug("p-" + UUID.randomUUID())
                .brand("B").category(category).description("D").fragranceFamily("F").topNotes("T")
                .middleNotes("M").baseNotes("B").longevity("L").projection("P").gender(Gender.UNISEX)
                .shortDescription("short").build());
        variant = productVariantRepository.save(ProductVariant.builder().product(product).size("10 ml")
                .price(new BigDecimal("100")).stock(50).active(true).sku("SKU-" + UUID.randomUUID())
                .productType(ProductType.ATTAR).image("img.jpg").build());
    }

    private Order createConfirmedPaidOrder(int quantity) {
        Order order = Order.builder()
                .orderNumber("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .user(testUser)
                .shippingAddress(testAddress)
                .status(OrderStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.PAID)
                .paymentMethod("ONLINE")
                .transactionId("pay_" + UUID.randomUUID())
                .totalAmount(new BigDecimal("100").multiply(BigDecimal.valueOf(quantity)))
                .shippingCost(BigDecimal.ZERO)
                .build();
        OrderItem item = OrderItem.builder()
                .variant(variant).quantity(quantity)
                .productName("P").variantSize("10 ml")
                .originalPrice(new BigDecimal("100")).discountAmount(BigDecimal.ZERO)
                .unitPrice(new BigDecimal("100"))
                .subtotal(new BigDecimal("100").multiply(BigDecimal.valueOf(quantity)))
                .build();
        order.addItem(item);
        return orderRepository.save(order);
    }

    @Test
    void concurrentCustomerCancelVsAdminPack_onlyOneTransitionWins_inventoryConsistent() throws InterruptedException {
        Order order = createConfirmedPaidOrder(2);
        int stockBefore = productVariantRepository.findById(variant.getId()).orElseThrow().getStock();

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch latch = new CountDownLatch(2);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        executor.submit(() -> {
            try {
                orderService.cancelOrder(testUser.getEmail(), order.getId());
                successCount.incrementAndGet();
            } catch (Exception e) {
                failCount.incrementAndGet();
            } finally {
                latch.countDown();
            }
        });
        executor.submit(() -> {
            try {
                orderService.updateOrderStatus(order.getId(), "PACKED");
                successCount.incrementAndGet();
            } catch (Exception e) {
                failCount.incrementAndGet();
            } finally {
                latch.countDown();
            }
        });

        latch.await();
        executor.shutdown();

        assertEquals(1, successCount.get(), "Exactly one of cancel/pack must win the race");
        assertEquals(1, failCount.get());

        Order finalOrder = orderRepository.findById(order.getId()).orElseThrow();
        assertTrue(finalOrder.getStatus() == OrderStatus.CANCELLED || finalOrder.getStatus() == OrderStatus.PACKED,
                "Order must have landed cleanly in exactly one terminal state, not a torn/inconsistent one");

        int stockAfter = productVariantRepository.findById(variant.getId()).orElseThrow().getStock();
        if (finalOrder.getStatus() == OrderStatus.CANCELLED) {
            assertEquals(stockBefore + 2, stockAfter, "Cancellation won — inventory must be restored");
            assertEquals("REFUND_REQUIRED", finalOrder.getRefundStatus().name());
        } else {
            assertEquals(stockBefore, stockAfter, "Pack won — inventory must NOT be touched");
        }
    }

    @Test
    void doubleCancellation_onlyOneSucceeds_inventoryRestoredExactlyOnce() throws InterruptedException {
        Order order = createConfirmedPaidOrder(3);
        int stockBefore = productVariantRepository.findById(variant.getId()).orElseThrow().getStock();

        int threads = 5;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    orderService.cancelOrder(testUser.getEmail(), order.getId());
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }
        latch.await();
        executor.shutdown();

        assertEquals(1, successCount.get(), "Only one of the concurrent cancel attempts should succeed");
        assertEquals(threads - 1, failCount.get());

        int stockAfter = productVariantRepository.findById(variant.getId()).orElseThrow().getStock();
        assertEquals(stockBefore + 3, stockAfter, "Inventory must be restored exactly once, not once per attempt");
    }

    @Test
    void concurrentAdminRefundProcessing_razorpayCalledExactlyOnce() throws InterruptedException {
        Order order = createConfirmedPaidOrder(1);
        orderService.cancelOrder(testUser.getEmail(), order.getId());

        // Simulate real Razorpay latency so concurrent threads have an actual window to race inside
        // claimAdminRefundProcessing's atomic claim, not just a theoretical one.
        when(paymentService.initiateRefund(anyString(), any(BigDecimal.class))).thenAnswer(inv -> {
            Thread.sleep(50);
            return RefundResult.builder().success(true).refundId("rfnd_concurrency_test").build();
        });

        int threads = 3;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    orderService.initiateRefund("admin@alahadattars.com", order.getId());
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }
        latch.await();
        executor.shutdown();

        // Razorpay must be called exactly once regardless of how many admin requests raced —
        // this is the hard "never produce two refunds" requirement.
        verify(paymentService, times(1)).initiateRefund(anyString(), any(BigDecimal.class));

        Order finalOrder = orderRepository.findById(order.getId()).orElseThrow();
        assertEquals("REFUNDED", finalOrder.getRefundStatus().name());
    }
}
