package com.alahadattars.service.impl;

import com.alahadattars.dto.order.OrderItemRequest;
import com.alahadattars.dto.order.OrderRequest;
import com.alahadattars.entity.Address;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.entity.User;
import com.alahadattars.enums.PromotionType;
import com.alahadattars.enums.RoleType;
import com.alahadattars.repository.AddressRepository;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.repository.RoleRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
public class PromotionConcurrencyTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private AddressRepository addressRepository;

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

        // Since this test tests concurrency, we must NOT use @Transactional at class level,
        // otherwise all threads will block on uncommitted state. 
        // We set up data transactionally here.
        com.alahadattars.entity.Role testRole = roleRepository.findByName(RoleType.USER).orElseGet(() -> {
            com.alahadattars.entity.Role r = new com.alahadattars.entity.Role();
            r.setName(RoleType.USER);
            r.setDescription("User");
            r.setActive(true);
            return roleRepository.save(r);
        });

        testUser = userRepository.save(User.builder().email("concurrent@example.com").phone("+919876500001").password("pwd").firstName("C").lastName("U").role(testRole).build());
        testAddress = addressRepository.save(Address.builder().user(testUser).fullName("C U").addressLine1("123").city("C").state("S").postalCode("123").phone("+919876500001").country("India").build());
        Category category = categoryRepository.save(Category.builder().name("C").description("desc").image("img").type(com.alahadattars.enums.CategoryType.ATTARS).build());
        Product product = productRepository.save(Product.builder().name("P").slug("p-concurrent").brand("B").category(category).description("D").fragranceFamily("F").topNotes("T").middleNotes("M").baseNotes("B").longevity("L").projection("P").gender(com.alahadattars.enums.Gender.UNISEX).shortDescription("short").build());
        
        paidVariant = productVariantRepository.save(ProductVariant.builder().product(product).size("12 ml").price(new BigDecimal("1000")).stock(100).active(true).sku("P-12-conc").productType(com.alahadattars.enums.ProductType.ATTAR).image("img.jpg").build());
        
        // CRITICAL: Inventory is exactly 1
        freeVariant = productVariantRepository.save(ProductVariant.builder().product(product).size("3 ml").price(new BigDecimal("300")).stock(1).active(true).sku("P-3-conc").productType(com.alahadattars.enums.ProductType.ATTAR).image("img.jpg").build());

        freePromotion = new Promotion();
        freePromotion.setName("Concurrency Promo");
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

    @Test
    void testConcurrentFreeGiftCheckout_OnlyOneSucceeds() throws InterruptedException {
        int threads = 5;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        // Each thread needs its OWN PaymentIntent + OrderRequest (a shared razorpayOrderId would
        // make this a payment-intent-uniqueness race instead of the freeVariant stock=1 race this
        // test is actually meant to exercise).
        for (int i = 0; i < threads; i++) {
            String razorpayOrderId = "order_conc_" + i;
            PaymentIntent intent = PaymentIntent.builder()
                    .razorpayOrderId(razorpayOrderId)
                    .user(testUser)
                    .amount(new BigDecimal("1000.00"))
                    .consumed(false)
                    .build();
            paymentIntentRepository.save(intent);

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
            orderRequest.setRazorpayOrderId(razorpayOrderId);
            orderRequest.setRazorpayPaymentId("pay_" + razorpayOrderId);
            orderRequest.setRazorpaySignature("sig_" + razorpayOrderId);

            executor.submit(() -> {
                try {
                    orderService.createOrder(testUser.getEmail(), orderRequest);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    e.printStackTrace();
                    failCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        // Exactly one thread should succeed, others should fail due to insufficient inventory
        assertEquals(1, successCount.get(), "Only 1 order should succeed due to stock limit of 1");
        assertEquals(4, failCount.get(), "4 orders should fail");
    }
}
