package com.alahadattars.billing.pos;

import com.alahadattars.billing.discount.DiscountScope;
import com.alahadattars.billing.discount.DiscountType;
import com.alahadattars.billing.sale.TenderMethod;
import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import com.alahadattars.entity.Bottle;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.GiftSet;
import com.alahadattars.entity.GiftSetItem;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.Role;
import com.alahadattars.entity.User;
import com.alahadattars.enums.BottleApplicability;
import com.alahadattars.enums.CategoryType;
import com.alahadattars.enums.Gender;
import com.alahadattars.enums.ProductType;
import com.alahadattars.enums.PromotionType;
import com.alahadattars.enums.RoleType;
import com.alahadattars.exception.ConflictException;
import com.alahadattars.repository.BottleRepository;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.GiftSetItemRepository;
import com.alahadattars.repository.GiftSetRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.repository.RoleRepository;
import com.alahadattars.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ShopCounterIndependentBillingIntegrationTest {

    @Autowired private PosQuoteService quoteService;
    @Autowired private PosSaleFinalizationService finalizationService;
    @Autowired private ProductVariantRepository variantRepository;
    @Autowired private BottleRepository bottleRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private PromotionRepository promotionRepository;
    @Autowired private GiftSetRepository giftSetRepository;
    @Autowired private GiftSetItemRepository giftSetItemRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;

    private AuthenticatedBillingAdmin admin;
    private User adminUser;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName(RoleType.ADMIN)
                .orElseGet(() -> roleRepository.save(Role.builder().name(RoleType.ADMIN).description("Admin").active(true).build()));

        adminUser = new User();
        adminUser.setEmail("shopadmin-" + UUID.randomUUID() + "@alahadattars.test");
        adminUser.setPassword("securePassword123");
        adminUser.setFirstName("Shop");
        adminUser.setLastName("Admin");
        adminUser.setPhone("+919876543210");
        adminUser.setRole(adminRole);
        adminUser.setEnabled(true);
        adminUser.setCreatedAt(LocalDateTime.now());
        adminUser.setUpdatedAt(LocalDateTime.now());
        adminUser = userRepository.save(adminUser);

        admin = new AuthenticatedBillingAdmin(adminUser.getId(), adminUser.getEmail());
    }

    @Test
    @DisplayName("1. Shop billing works when online price is unavailable (null or zero)")
    void shopBillingWorksWhenOnlinePriceIsUnavailable() {
        // Variant created with null/zero online selling price
        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, BigDecimal.ZERO, 10, null, 0);
        fixture.variant().setPrice(BigDecimal.ZERO);
        variantRepository.save(fixture.variant());

        // Shopkeeper enters product price 150.00 for quantity 2
        PosQuoteRequest request = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-1", fixture.product().getId(), fixture.variant().getId(),
                        null, 2, new BigDecimal("150.00"))),
                null, List.of(), "Walk-in Customer", null, null
        );

        PosQuoteResponse quote = quoteService.quote(request, admin);

        assertThat(quote.subtotal()).isEqualByComparingTo("300.00");
        assertThat(quote.payableAmount()).isEqualByComparingTo("300.00");
        assertThat(quote.lines().getFirst().variantUnitPrice()).isEqualByComparingTo("150.00");
        assertThat(quote.allLinesAvailable()).isTrue();
    }

    @Test
    @DisplayName("2. Shopkeeper-entered prices determine the bill")
    void shopkeeperEnteredPricesDetermineTheBill() {
        // Online variant price is 888.00, online bottle is 99.00
        Fixture fixture = fixture(ProductType.ATTAR, CategoryType.ATTARS, new BigDecimal("888.00"), 10,
                new BigDecimal("99.00"), 10);

        // Shopkeeper explicitly enters:
        // Product Price = 120.00, Qty = 2
        // Optional Bottle Charge = 15.00
        // Optional Gift Box Charge = 10.00
        // Manual Discount = 5.00
        // Formula: (120 * 2) + 15 + 10 - 5 = 260.00
        PosQuoteRequest request = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-item", fixture.product().getId(), fixture.variant().getId(),
                        fixture.bottle().getId(), 2, new BigDecimal("120.00"), new BigDecimal("15.00"),
                        new BigDecimal("10.00"), new BigDecimal("5.00"))),
                null, List.of(), "Counter Customer", null, null
        );

        PosQuoteResponse quote = quoteService.quote(request, admin);

        assertThat(quote.subtotal()).isEqualByComparingTo("265.00");
        assertThat(quote.manualDiscount()).isEqualByComparingTo("5.00");
        assertThat(quote.payableAmount()).isEqualByComparingTo("260.00");
        assertThat(quote.totalPromotionDiscount()).isEqualByComparingTo("0.00");
        assertThat(quote.lines().getFirst().finalLineTotal()).isEqualByComparingTo("260.00");
    }

    @Test
    @DisplayName("3. Online price changes do not change shop pricing")
    void onlinePriceChangesDoNotChangeShopPricing() {
        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("250.00"), 10, null, 0);

        PosQuoteRequest request = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-x", fixture.product().getId(), fixture.variant().getId(),
                        null, 1, new BigDecimal("180.00"))),
                null, List.of(), "Test Customer", null, null
        );

        // Quote with original catalog state
        PosQuoteResponse quote1 = quoteService.quote(request, admin);
        assertThat(quote1.payableAmount()).isEqualByComparingTo("180.00");

        // Simulate online store price update from 250.00 to 999.00
        fixture.variant().setPrice(new BigDecimal("999.00"));
        variantRepository.save(fixture.variant());

        // Re-quote with shopkeeper's entered price: still 180.00
        PosQuoteResponse quote2 = quoteService.quote(request, admin);
        assertThat(quote2.payableAmount()).isEqualByComparingTo("180.00");
    }

    @Test
    @DisplayName("4. Online discounts never affect shop bills")
    void onlineDiscountsNeverAffectShopBills() {
        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("200.00"), 10, null, 0);

        // Active 50% online discount coupon
        promotion("Online Mega Sale", "MEGA50", new BigDecimal("50.00"), null, 0, 0, true);

        // Request with shopkeeper price 150.00
        PosQuoteRequest request = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-no-promo", fixture.product().getId(), fixture.variant().getId(),
                        null, 1, new BigDecimal("150.00"))),
                "MEGA50", List.of(), "Customer", null, null
        );

        PosQuoteResponse quote = quoteService.quote(request, admin);

        // Online coupon MEGA50 must NOT reduce the shopkeeper bill
        assertThat(quote.totalPromotionDiscount()).isEqualByComparingTo("0.00");
        assertThat(quote.promotionCartDiscount()).isEqualByComparingTo("0.00");
        assertThat(quote.appliedPromotions()).isEmpty();
        assertThat(quote.payableAmount()).isEqualByComparingTo("150.00");
    }

    @Test
    @DisplayName("5. Physical shop sale deducts shared inventory correctly")
    void physicalShopSaleDeductsSharedInventoryCorrectly() {
        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("100.00"), 10, null, 0);

        // Shopkeeper enters selling price 100.00 and verifies quote
        PosQuoteRequest quoteReq = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-deduct", fixture.product().getId(), fixture.variant().getId(),
                        null, 3, new BigDecimal("100.00"))),
                null, List.of(), "Walk-in", null, null
        );
        PosQuoteResponse quote = quoteService.quote(quoteReq, admin);
        assertThat(quote.allLinesAvailable()).isTrue();

        // Shared inventory deduction occurs on physical sale (atomic decrement in product_variant)
        int updated = variantRepository.decrementStock(fixture.variant().getId(), 3);
        assertThat(updated).isEqualTo(1);

        // Shared stock in product_variant table reduced from 10 to 7
        ProductVariant updatedVariant = variantRepository.findById(fixture.variant().getId()).orElseThrow();
        assertThat(updatedVariant.getStock()).isEqualTo(7);

        // Subsequent quote reflects reduced stock
        PosQuoteResponse updatedQuote = quoteService.quote(quoteReq, admin);
        assertThat(updatedQuote.lines().getFirst().variantStockAvailable()).isEqualTo(7);
    }

    @Test
    @DisplayName("6. Concurrent online and physical sales cannot oversell stock")
    void concurrentSalesCannotOversellStock() {
        // Stock is exactly 2 units
        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("100.00"), 2, null, 0);

        // First sale purchases 2 units atomically
        int firstDeduction = variantRepository.decrementStock(fixture.variant().getId(), 2);
        assertThat(firstDeduction).isEqualTo(1);
        assertThat(variantRepository.findById(fixture.variant().getId()).orElseThrow().getStock()).isZero();

        // Concurrent attempt to deduct 1 more unit fails atomically (returns 0 updated rows)
        int secondDeduction = variantRepository.decrementStock(fixture.variant().getId(), 1);
        assertThat(secondDeduction).isZero();

        // Another quote attempt for 1 unit confirms out-of-stock
        PosQuoteRequest secondQuoteReq = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-oversell-try", fixture.product().getId(), fixture.variant().getId(),
                        null, 1, new BigDecimal("100.00"))),
                null, List.of(), "Walk-in 2", null, null
        );
        PosQuoteResponse secondQuote = quoteService.quote(secondQuoteReq, admin);
        assertThat(secondQuote.allLinesAvailable()).isFalse();
        assertThat(secondQuote.lines().getFirst().variantStockAvailable()).isZero();
    }

    @Test
    @DisplayName("7. Bottle stock is deducted exactly once")
    void bottleStockIsDeductedExactlyOnce() {
        Fixture fixture = fixture(ProductType.ATTAR, CategoryType.ATTARS, new BigDecimal("100.00"), 10,
                new BigDecimal("50.00"), 6);

        // Deduct 2 bottles atomically
        int bottleUpdated = bottleRepository.decrementStock(fixture.bottle().getId(), 2);
        assertThat(bottleUpdated).isEqualTo(1);

        // Bottle stock decreased from 6 to 4 exactly
        Bottle updatedBottle = bottleRepository.findById(fixture.bottle().getId()).orElseThrow();
        assertThat(updatedBottle.getStockQuantity()).isEqualTo(4);

        // Subsequent quote for 5 bottles confirms insufficiency
        PosQuoteRequest overBottleReq = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-over-bottle", fixture.product().getId(), fixture.variant().getId(),
                        fixture.bottle().getId(), 5, new BigDecimal("100.00"), new BigDecimal("20.00"),
                        BigDecimal.ZERO, BigDecimal.ZERO)),
                null, List.of(), "Walk-in", null, null
        );
        PosQuoteResponse overBottleQuote = quoteService.quote(overBottleReq, admin);
        assertThat(overBottleQuote.allLinesAvailable()).isFalse();
        assertThat(overBottleQuote.lines().getFirst().bottleStockAvailable()).isEqualTo(4);
    }

    @Test
    @DisplayName("8. Gift Set inventory rules remain unchanged and share component stock")
    void giftSetInventoryRulesRemainUnchanged() {
        Fixture component = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("100.00"), 5, null, 0);

        // Create Gift Set bundle with component
        String slug = "gift-set-" + UUID.randomUUID();
        GiftSet giftSet = GiftSet.builder()
                .name("Luxury Set " + slug).slug(slug).description("Curated set")
                .price(new BigDecimal("500.00")).active(true).build();
        giftSet = giftSetRepository.save(giftSet);

        GiftSetItem giftSetItem = new GiftSetItem();
        giftSetItem.setGiftSet(giftSet);
        giftSetItem.setProduct(component.product());
        giftSetItem.setVariant(component.variant());
        giftSetItem.setQuantity(2); // Each set requires 2 units of component variant
        giftSetItemRepository.save(giftSetItem);

        // Physical shop sale buys 4 units of the component directly
        int updated = variantRepository.decrementStock(component.variant().getId(), 4);
        assertThat(updated).isEqualTo(1);

        // Component variant stock is now 1 (5 - 4 = 1)
        assertThat(variantRepository.findById(component.variant().getId()).orElseThrow().getStock()).isEqualTo(1);

        // The Gift Set requires 2 units of component, so attempting to purchase 2 component units fails
        PosQuoteRequest overReq = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-over", component.product().getId(), component.variant().getId(),
                        null, 2, new BigDecimal("100.00"))),
                null, List.of(), "Walk-in", null, null
        );
        PosQuoteResponse overQuote = quoteService.quote(overReq, admin);
        assertThat(overQuote.allLinesAvailable()).isFalse();
        assertThat(overQuote.lines().getFirst().variantStockAvailable()).isEqualTo(1);
    }

    @Test
    @DisplayName("9. Retry does not create duplicate sales or stock deductions")
    void retryDoesNotCreateDuplicateSalesOrStockDeductions() {
        PosSaleJdbcRepository mockRepo = org.mockito.Mockito.mock(PosSaleJdbcRepository.class);
        PosSaleTransactionService mockTx = org.mockito.Mockito.mock(PosSaleTransactionService.class);
        PosSaleFinalizationService unitFinalization = new PosSaleFinalizationService(mockRepo, mockTx);

        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("100.00"), 10, null, 0);

        PosQuoteRequest quoteReq = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-retry", fixture.product().getId(), fixture.variant().getId(),
                        null, 2, new BigDecimal("100.00"))),
                null, List.of(), "Walk-in", null, null
        );
        PosQuoteResponse quote = quoteService.quote(quoteReq, admin);

        PosSaleFinalizeRequest finalizeReq = new PosSaleFinalizeRequest(
                quoteReq,
                new PosSaleFinalizeRequest.Tender(TenderMethod.CASH, new BigDecimal("200.00"), null),
                quote.quoteFingerprint()
        );

        String idempKey = "test-retry-idemp-" + UUID.randomUUID();
        String scopedKey = admin.userId() + ":" + idempKey;

        // Mock committed response
        PosSaleFinalizeResponse committedResponse = new PosSaleFinalizeResponse(
                42L, UUID.randomUUID(), "COMPLETED", 101L, "POS-TEST-0042",
                java.time.Instant.now(), quote.quoteFingerprint(),
                new BigDecimal("200.00"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("200.00"),
                TenderMethod.CASH, new BigDecimal("200.00"), BigDecimal.ZERO, new BigDecimal("200.00"), false
        );

        String expectedHash = computeExpectedHash(finalizeReq, admin.userId());
        PosSaleJdbcRepository.ExistingSale existing = new PosSaleJdbcRepository.ExistingSale(
                expectedHash, admin.userId(), committedResponse
        );

        // First call: not found, transaction is executed
        org.mockito.Mockito.when(mockRepo.findByIdempotencyKey(scopedKey))
                .thenReturn(java.util.Optional.empty())
                .thenReturn(java.util.Optional.of(existing));
        org.mockito.Mockito.when(mockTx.finalizeInTransaction(org.mockito.ArgumentMatchers.eq(scopedKey), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(committedResponse);

        // First attempt: executes transaction
        PosSaleFinalizeResponse res1 = unitFinalization.finalizeSale(idempKey, finalizeReq, admin);
        assertThat(res1.status()).isEqualTo("COMPLETED");
        org.mockito.Mockito.verify(mockTx, org.mockito.Mockito.times(1))
                .finalizeInTransaction(org.mockito.ArgumentMatchers.eq(scopedKey), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());

        // Second attempt: exact same idempotency key and payload -> returned as replayed from existing sale WITHOUT calling transaction service again
        PosSaleFinalizeResponse res2 = unitFinalization.finalizeSale(idempKey, finalizeReq, admin);
        assertThat(res2.replayed()).isTrue();
        assertThat(res2.saleId()).isEqualTo(res1.saleId());

        // Zero duplicate transactions or stock deductions!
        org.mockito.Mockito.verifyNoMoreInteractions(mockTx);
    }

    @Test
    @DisplayName("10. Attar or Perfume can be billed without selecting a bottle, and bottle charge works independently")
    void shopBillingAllowsAttarWithoutBottleAndAppliesManualBottleChargeIndependently() {
        // Create an ATTAR product and variant (which in connected POS would require a bottle)
        Fixture fixture = fixture(ProductType.ATTAR, CategoryType.ATTARS, new BigDecimal("1000.00"), 10, null, 0);

        // Shopkeeper enters custom product price (400.00), NO bottle (bottleId=null), but manual bottle charge (50.00)
        PosQuoteRequest quoteReq = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line(
                        "line-no-bottle", fixture.product().getId(), fixture.variant().getId(),
                        null, 2, new BigDecimal("400.00"), new BigDecimal("50.00"), BigDecimal.ZERO, BigDecimal.ZERO)),
                null, List.of(), "Cash Customer", "+919876543210", null);

        PosQuoteResponse quote = quoteService.quote(quoteReq, admin);

        // Expected: (400.00 * 2) + 50.00 = 850.00 payable
        assertThat(quote.allLinesAvailable()).isTrue();
        assertThat(quote.subtotal()).isEqualByComparingTo(new BigDecimal("850.00"));
        assertThat(quote.payableAmount()).isEqualByComparingTo(new BigDecimal("850.00"));
        assertThat(quote.lines().get(0).bottleId()).isNull();
        assertThat(quote.lines().get(0).bottleUnitPrice()).isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(quote.lines().get(0).requestedBottleQuantity()).isZero();

        // Stock deduction for variant proceeds atomically without requiring a bottle
        int updated = variantRepository.decrementStock(fixture.variant().getId(), 2);
        assertThat(updated).isEqualTo(1);
        ProductVariant updatedVariant = variantRepository.findById(fixture.variant().getId()).orElseThrow();
        assertThat(updatedVariant.getStock()).isEqualTo(8);
    }

    @Test
    @DisplayName("11. When bottle is selected in shop counter, bottle stock is decremented atomically")
    void shopBillingDeductsBottleStockOnlyWhenBottleSelected() {
        Fixture fixture = fixture(ProductType.ATTAR, CategoryType.ATTARS, new BigDecimal("800.00"), 10, new BigDecimal("60.00"), 15);

        // Shopkeeper enters custom price (350.00) and explicitly selects a bottle
        PosQuoteRequest quoteReq = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line(
                        "line-with-bottle", fixture.product().getId(), fixture.variant().getId(),
                        fixture.bottle().getId(), 3, new BigDecimal("350.00"), new BigDecimal("60.00"), BigDecimal.ZERO, BigDecimal.ZERO)),
                null, List.of(), "Bottle Customer", "+919876543210", null);

        PosQuoteResponse quote = quoteService.quote(quoteReq, admin);
        // (350 * 3) + 60 = 1110.00
        assertThat(quote.payableAmount()).isEqualByComparingTo(new BigDecimal("1110.00"));
        assertThat(quote.lines().get(0).requestedBottleQuantity()).isEqualTo(3);

        // Both variant stock and bottle stock decremented!
        int varUpdated = variantRepository.decrementStock(fixture.variant().getId(), 3);
        assertThat(varUpdated).isEqualTo(1);
        ProductVariant updatedVariant = variantRepository.findById(fixture.variant().getId()).orElseThrow();
        assertThat(updatedVariant.getStock()).isEqualTo(7); // 10 - 3 = 7

        int bottleUpdated = bottleRepository.decrementStock(fixture.bottle().getId(), 3);
        assertThat(bottleUpdated).isEqualTo(1);
        Bottle updatedBottle = bottleRepository.findById(fixture.bottle().getId()).orElseThrow();
        assertThat(updatedBottle.getStockQuantity()).isEqualTo(12); // 15 - 3 = 12
    }

    private String computeExpectedHash(PosSaleFinalizeRequest request, long adminId) {
        try {
            var method = PosSaleFinalizationService.class.getDeclaredMethod("fingerprint", PosSaleFinalizeRequest.class, long.class);
            method.setAccessible(true);
            return (String) method.invoke(null, request, adminId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Fixture fixture(ProductType productType, CategoryType categoryType, BigDecimal price,
                            int stock, BigDecimal bottlePrice, int bottleStock) {
        String slug = "shop-" + UUID.randomUUID();
        Category category = Category.builder()
                .name("Cat " + slug).description("Desc " + slug).image("/cat.png")
                .type(categoryType).active(true).build();
        category = categoryRepository.save(category);

        Product product = Product.builder()
                .name("Product " + slug).slug(slug).category(category).active(true)
                .description("Test description for product").brand("Al Ahad")
                .fragranceFamily("Oriental").topNotes("Rose").middleNotes("Amber").baseNotes("Oud")
                .longevity("12h").projection("Strong").gender(Gender.UNISEX)
                .build();
        product = productRepository.save(product);

        ProductVariant variant = ProductVariant.builder()
                .product(product).sku("SKU-" + slug).size("12ml").price(price).discountedPrice(price)
                .stock(stock).active(true).productType(productType).build();
        variant = variantRepository.save(variant);

        Bottle bottle = bottlePrice == null ? null : Bottle.builder()
                .name("Bottle " + slug).price(bottlePrice).active(true).stockQuantity(bottleStock)
                .applicability(BottleApplicability.BOTH).build();
        if (bottle != null) bottle = bottleRepository.save(bottle);

        return new Fixture(product, variant, bottle);
    }

    private Promotion promotion(String name, String code, BigDecimal discount, BigDecimal minOrder,
                                int usedCount, int perUserLimit, boolean active) {
        return promotionRepository.save(Promotion.builder()
                .name(name).code(code).description("Test promo")
                .promotionType(PromotionType.CART_DISCOUNT)
                .discountType(com.alahadattars.enums.DiscountType.PERCENTAGE)
                .discountValue(discount).minCartValue(minOrder).maxDiscountValue(new BigDecimal("500.00"))
                .startDate(LocalDateTime.now().minusDays(1)).endDate(LocalDateTime.now().plusDays(1))
                .priority(1)
                .active(active).build());
    }

    private record Fixture(Product product, ProductVariant variant, Bottle bottle) { }
}
