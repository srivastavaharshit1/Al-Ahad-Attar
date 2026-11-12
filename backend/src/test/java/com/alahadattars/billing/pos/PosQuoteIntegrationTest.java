package com.alahadattars.billing.pos;

import com.alahadattars.billing.discount.DiscountScope;
import com.alahadattars.billing.discount.DiscountType;
import com.alahadattars.entity.Bottle;
import com.alahadattars.entity.Category;
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
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.BottleRepository;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.security.CustomUserDetails;
import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
@Transactional
class PosQuoteIntegrationTest {
    @Autowired private PosQuoteService quoteService;
    @Autowired private ProductVariantRepository variantRepository;
    @Autowired private BottleRepository bottleRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private PromotionRepository promotionRepository;
    @Autowired private MockMvc mockMvc;

    @Test
    void quoteUsesPersistedVariantAndBottlePricesAndDoesNotChangeStock() {
        Fixture fixture = fixture(ProductType.ATTAR, CategoryType.ATTARS, new BigDecimal("100.00"),
                new BigDecimal("1.00"), 8, new BigDecimal("5.00"), 6);
        PosQuoteRequest request = request(
                new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(),
                        fixture.bottle().getId(), 2),
                null,
                new PosQuoteRequest.ManualDiscount(DiscountScope.ITEM, DiscountType.FIXED,
                        new BigDecimal("10.00"), "line-a", "Customer loyalty"));

        PosQuoteResponse quote = quoteService.quote(request, admin());

        assertThat(quote.previewOnly()).isTrue();
        assertThat(quote.adminId()).isEqualTo(77L);
        assertThat(quote.adminEmail()).isEqualTo("admin@example.test");
        assertThat(quote.subtotal()).isEqualByComparingTo("210.00");
        assertThat(quote.totalPromotionDiscount()).isEqualByComparingTo("0.00");
        assertThat(quote.manualDiscount()).isEqualByComparingTo("10.00");
        assertThat(quote.payableAmount()).isEqualByComparingTo("200.00");
        assertThat(quote.lines()).hasSize(1);
        assertThat(quote.lines().getFirst().variantUnitPrice()).isEqualByComparingTo("100.00");
        assertThat(quote.lines().getFirst().bottleUnitPrice()).isEqualByComparingTo("5.00");
        assertThat(quote.lines().getFirst().unitPrice()).isEqualByComparingTo("105.00");
        assertThat(quote.lines().getFirst().lineAfterPromotions()).isEqualByComparingTo("210.00");
        assertThat(quote.lines().getFirst().finalLineTotal()).isEqualByComparingTo("200.00");
        assertThat(quote.lines().getFirst().available()).isTrue();
        assertThat(variantRepository.findById(fixture.variant().getId()).orElseThrow().getStock()).isEqualTo(8);
        assertThat(bottleRepository.findById(fixture.bottle().getId()).orElseThrow().getStockQuantity()).isEqualTo(6);
    }

    @Test
    void posQuoteExcludesPerUserPromotionsAndExhaustedGlobalPromotionsWithoutClaiming() {
        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("100.00"),
                new BigDecimal("0.01"), 10, null, 0);
        Promotion eligible = promotion("POS unlimited", null, new BigDecimal("10.00"), null, 0, 0, true);
        Promotion perUserLimited = promotion("POS per-user limited", null, new BigDecimal("90.00"), null, 0, 1, true);
        Promotion globalExhausted = promotion("POS global exhausted", null, new BigDecimal("50.00"), 1, 1, 0, true);

        PosQuoteResponse quote = quoteService.quote(request(
                new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(), null, 1),
                null), admin());

        assertThat(quote.promotionItemDiscount()).isEqualByComparingTo("0.00");
        assertThat(quote.promotionCartDiscount()).isEqualByComparingTo("10.00");
        assertThat(quote.payableAmount()).isEqualByComparingTo("90.00");
        assertThat(quote.appliedPromotions()).extracting(PosQuoteResponse.PromotionSummary::id)
                .containsExactly(eligible.getId());
        assertThat(quote.availablePromotions()).extracting(PosQuoteResponse.PromotionSummary::id)
                .doesNotContain(perUserLimited.getId(), globalExhausted.getId());
        assertThat(promotionRepository.findById(eligible.getId()).orElseThrow().getUsedCount()).isZero();
        assertThat(promotionRepository.findById(perUserLimited.getId()).orElseThrow().getUsedCount()).isZero();
        assertThat(promotionRepository.findById(globalExhausted.getId()).orElseThrow().getUsedCount()).isEqualTo(1);
    }

    @Test
    void itemAndSaleDiscountsApplyAfterPromotionsAndReconcileExactly() {
        Fixture fixture = fixture(ProductType.ATTAR, CategoryType.ATTARS, new BigDecimal("100.00"),
                new BigDecimal("0.01"), 10, new BigDecimal("5.00"), 10);
        Promotion promotion = promotion("POS cart 10 percent", null, new BigDecimal("10.00"), null, 0, 0, true);
        PosQuoteRequest request = request(
                new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(),
                        fixture.bottle().getId(), 2), null,
                new PosQuoteRequest.ManualDiscount(DiscountScope.ITEM, DiscountType.FIXED,
                        new BigDecimal("10.00"), "line-a", "Item adjustment"),
                new PosQuoteRequest.ManualDiscount(DiscountScope.SALE, DiscountType.PERCENT,
                        new BigDecimal("10.00"), null, "Sale courtesy"));

        PosQuoteResponse quote = quoteService.quote(request, admin());

        assertThat(quote.appliedPromotions()).extracting(PosQuoteResponse.PromotionSummary::id)
                .contains(promotion.getId());
        assertThat(quote.subtotal()).isEqualByComparingTo("210.00");
        assertThat(quote.promotionCartDiscount()).isEqualByComparingTo("21.00");
        assertThat(quote.manualDiscount()).isEqualByComparingTo("27.90");
        assertThat(quote.payableAmount()).isEqualByComparingTo("161.10");
        assertThat(quote.lines().getFirst().promotionDiscount()).isEqualByComparingTo("21.00");
        assertThat(quote.lines().getFirst().manualDiscount()).isEqualByComparingTo("27.90");
        assertThat(quote.lines().getFirst().finalLineTotal()).isEqualByComparingTo("161.10");
        assertThat(quote.manualDiscounts()).extracting(PosQuoteResponse.ManualDiscountPreview::appliedAmount)
                .containsExactly(new BigDecimal("10.00"), new BigDecimal("17.90"));
    }

    @Test
    void manualDiscountCannotPushPayableBelowZeroAfterPromotion() {
        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("100.00"),
                new BigDecimal("0.01"), 10, null, 0);
        promotion("POS full cart discount", null, new BigDecimal("100.00"), null, 0, 0, true);

        assertThatThrownBy(() -> quoteService.quote(request(
                new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(), null, 1),
                null,
                new PosQuoteRequest.ManualDiscount(DiscountScope.ITEM, DiscountType.FIXED,
                        new BigDecimal("0.01"), "line-a", "Attempted excess")), admin()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("eligible remaining balance");
    }

    @Test
    void quoteRejectsVariantProductMismatchAndMissingRequiredBottle() {
        Fixture fixture = fixture(ProductType.ATTAR, CategoryType.ATTARS, new BigDecimal("100.00"),
                new BigDecimal("0.01"), 10, new BigDecimal("5.00"), 10);
        Fixture other = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("200.00"),
                new BigDecimal("0.01"), 10, null, 0);

        assertThatThrownBy(() -> quoteService.quote(request(
                new PosQuoteRequest.Line("line-a", other.product().getId(), fixture.variant().getId(),
                        fixture.bottle().getId(), 1), null), admin()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("does not belong");

        assertThatThrownBy(() -> quoteService.quote(request(
                new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(), null, 1),
                null), admin()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("bottle must be selected");
    }

    @Test
    void quoteRejectsInactiveProductVariantAndBottle() {
        Fixture fixture = fixture(ProductType.ATTAR, CategoryType.ATTARS, new BigDecimal("100.00"),
                new BigDecimal("0.01"), 10, new BigDecimal("5.00"), 10);

        fixture.product().setActive(false);
        productRepository.saveAndFlush(fixture.product());
        assertThatThrownBy(() -> quoteService.quote(request(
                new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(),
                        fixture.bottle().getId(), 1), null), admin()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("inactive");

        fixture.product().setActive(true);
        productRepository.saveAndFlush(fixture.product());
        fixture.variant().setActive(false);
        variantRepository.saveAndFlush(fixture.variant());
        assertThatThrownBy(() -> quoteService.quote(request(
                new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(),
                        fixture.bottle().getId(), 1), null), admin()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("inactive");

        fixture.variant().setActive(true);
        variantRepository.saveAndFlush(fixture.variant());
        fixture.bottle().setActive(false);
        bottleRepository.saveAndFlush(fixture.bottle());
        assertThatThrownBy(() -> quoteService.quote(request(
                new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(),
                        fixture.bottle().getId(), 1), null), admin()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("bottle is inactive");
    }

    @Test
    void quoteRejectsBottleApplicabilityMismatch() {
        Fixture fixture = fixture(ProductType.PERFUME, CategoryType.ATTARS, new BigDecimal("100.00"),
                new BigDecimal("0.01"), 10, new BigDecimal("5.00"), 10);

        assertThatThrownBy(() -> quoteService.quote(request(
                new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(),
                        fixture.bottle().getId(), 1), null), admin()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("not applicable for Perfumes");
    }

    @Test
    void quoteRejectsInvalidQuantityAndExcessiveManualDiscounts() throws Exception {
        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("100.00"),
                new BigDecimal("0.01"), 10, null, 0);
        String invalidQuantity = """
                {"lines":[{"lineKey":"line-a","productId":%d,"variantId":%d,"quantity":0}],
                 "manualDiscounts":[]}
                """.formatted(fixture.product().getId(), fixture.variant().getId());
        mockMvc.perform(post("/api/billing/pos/quotes")
                        .with(authenticate(RoleType.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidQuantity))
                .andExpect(status().isBadRequest());

        assertThatThrownBy(() -> quoteService.quote(request(
                new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(), null, 1),
                null,
                new PosQuoteRequest.ManualDiscount(DiscountScope.SALE, DiscountType.PERCENT,
                        new BigDecimal("100.01"), null, "Excess percentage")), admin()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("cannot exceed 100%");

        assertThatThrownBy(() -> quoteService.quote(request(
                new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(), null, 1),
                null,
                new PosQuoteRequest.ManualDiscount(DiscountScope.SALE, DiscountType.FIXED,
                        new BigDecimal("100.01"), null, "Excess fixed discount")), admin()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("eligible remaining balance");
    }

    @Test
    void quoteRejectsMissingVariantAndOutOfRangeRequestValues() throws Exception {
        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("100.00"),
                new BigDecimal("0.01"), 10, null, 0);
        assertThatThrownBy(() -> quoteService.quote(request(
                new PosQuoteRequest.Line("line-a", fixture.product().getId(), Long.MAX_VALUE, null, 1), null), admin()))
                .isInstanceOf(ResourceNotFoundException.class);

        String excessiveQuantity = """
                {"lines":[{"lineKey":"line-a","productId":%d,"variantId":%d,"quantity":1000}],
                 "manualDiscounts":[]}
                """.formatted(fixture.product().getId(), fixture.variant().getId());
        mockMvc.perform(post("/api/billing/pos/quotes")
                        .with(authenticate(RoleType.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(excessiveQuantity))
                .andExpect(status().isBadRequest());

        String negativeDiscount = """
                {"lines":[{"lineKey":"line-a","productId":%d,"variantId":%d,"quantity":1}],
                 "manualDiscounts":[{"scope":"SALE","type":"FIXED","value":-1.00,"reason":"Invalid value"}]}
                """.formatted(fixture.product().getId(), fixture.variant().getId());
        mockMvc.perform(post("/api/billing/pos/quotes")
                        .with(authenticate(RoleType.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(negativeDiscount))
                .andExpect(status().isBadRequest());

        String oversizedDiscount = """
                {"lines":[{"lineKey":"line-a","productId":%d,"variantId":%d,"quantity":1}],
                 "manualDiscounts":[{"scope":"SALE","type":"FIXED","value":10000000000.00,"reason":"Invalid value"}]}
                """.formatted(fixture.product().getId(), fixture.variant().getId());
        mockMvc.perform(post("/api/billing/pos/quotes")
                        .with(authenticate(RoleType.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(oversizedDiscount))
                .andExpect(status().isBadRequest());
    }

    @Test
    void quoteAggregatesAvailabilityAcrossDuplicateStockDemandsWithoutDeducting() {
        Fixture fixture = fixture(ProductType.ATTAR, CategoryType.ATTARS, new BigDecimal("100.00"),
                new BigDecimal("0.01"), 1, new BigDecimal("5.00"), 1);
        PosQuoteResponse quote = quoteService.quote(new PosQuoteRequest(
                java.util.List.of(
                        new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(),
                                fixture.bottle().getId(), 1),
                        new PosQuoteRequest.Line("line-b", fixture.product().getId(), fixture.variant().getId(),
                                fixture.bottle().getId(), 1)), null, java.util.List.of(), null, null, null), admin());

        assertThat(quote.allLinesAvailable()).isFalse();
        assertThat(quote.lines()).allSatisfy(line -> {
            assertThat(line.variantStockSufficient()).isFalse();
            assertThat(line.bottleStockSufficient()).isFalse();
            assertThat(line.requestedVariantQuantity()).isEqualTo(2);
            assertThat(line.requestedBottleQuantity()).isEqualTo(2);
        });
        assertThat(variantRepository.findById(fixture.variant().getId()).orElseThrow().getStock()).isEqualTo(1);
        assertThat(bottleRepository.findById(fixture.bottle().getId()).orElseThrow().getStockQuantity()).isEqualTo(1);
    }

    @Test
    void adminCanRequestQuoteUserIsDeniedAndClientSubmittedPricesAreIgnored() throws Exception {
        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("100.00"),
                new BigDecimal("0.01"), 5, null, 0);
        String body = """
                {
                  "lines":[{"lineKey":"line-a","productId":%d,"variantId":%d,"quantity":1,
                    "unitPrice":0,"price":0,"lineTotal":0}],
                  "manualDiscounts":[],"subtotal":0,"payableAmount":0,"total":0
                }
                """.formatted(fixture.product().getId(), fixture.variant().getId());

        mockMvc.perform(post("/api/billing/pos/quotes")
                        .with(authenticate(RoleType.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotal").value(100.00))
                .andExpect(jsonPath("$.payableAmount").value(100.00))
                .andExpect(jsonPath("$.previewOnly").value(true));

        mockMvc.perform(post("/api/billing/pos/quotes")
                        .with(authenticate(RoleType.USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/billing/pos/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    private Fixture fixture(ProductType productType, CategoryType categoryType,
                            BigDecimal price, BigDecimal discountedPrice, int variantStock,
                            BigDecimal bottlePrice, int bottleStock) {
        LocalDateTime now = LocalDateTime.now();
        String suffix = UUID.randomUUID().toString().substring(0, 12);
        Category category = Category.builder().name("POS quote " + suffix).description("test")
                .image("test").type(categoryType).active(true).build();
        timestamps(category, now);
        category = categoryRepository.saveAndFlush(category);

        Product product = Product.builder().name("POS quote product " + suffix).slug("pos-quote-" + suffix)
                .shortDescription("test").description("test").brand("test").category(category)
                .fragranceFamily("test").topNotes("test").middleNotes("test").baseNotes("test")
                .longevity("test").projection("test").gender(Gender.UNISEX).active(true).build();
        timestamps(product, now);
        product = productRepository.saveAndFlush(product);

        ProductVariant variant = ProductVariant.builder().product(product).productType(productType)
                .size("10 ml").price(price).discountedPrice(discountedPrice).stock(variantStock)
                .sku("PQ-" + suffix).active(true).build();
        timestamps(variant, now);
        variant = variantRepository.saveAndFlush(variant);

        Bottle bottle = null;
        if (bottlePrice != null) {
            bottle = Bottle.builder().name("POS quote bottle " + suffix).price(bottlePrice)
                    .stockQuantity(bottleStock).active(true).applicability(BottleApplicability.ATTAR).build();
            timestamps(bottle, now);
            bottle = bottleRepository.saveAndFlush(bottle);
        }
        return new Fixture(product, variant, bottle);
    }

    private Promotion promotion(String name, String code, BigDecimal value,
                                Integer usageLimit, Integer usedCount, Integer perUserLimit, boolean stackable) {
        LocalDateTime now = LocalDateTime.now();
        Promotion promotion = Promotion.builder().name(name).code(code).promotionType(PromotionType.CART_DISCOUNT)
                .discountType(com.alahadattars.enums.DiscountType.PERCENTAGE).discountValue(value).usageLimit(usageLimit)
                .usedCount(usedCount).perUserLimit(perUserLimit).priority(10).active(true).stackable(stackable).build();
        timestamps(promotion, now);
        return promotionRepository.saveAndFlush(promotion);
    }

    private static PosQuoteRequest request(PosQuoteRequest.Line line, String couponCode,
                                           PosQuoteRequest.ManualDiscount... discounts) {
        return new PosQuoteRequest(java.util.List.of(line), couponCode, java.util.List.of(discounts),
                null, null, null);
    }

    private static AuthenticatedBillingAdmin admin() {
        User user = new User();
        user.setId(77L);
        user.setEmail("admin@example.test");
        Role role = new Role();
        role.setName(RoleType.ADMIN);
        user.setRole(role);
        CustomUserDetails principal = new CustomUserDetails(user);
        return AuthenticatedBillingAdmin.from(new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities()));
    }

    private static RequestPostProcessor authenticate(RoleType roleType) {
        User user = new User();
        user.setId(roleType == RoleType.ADMIN ? 77L : 78L);
        user.setEmail(roleType.name().toLowerCase(java.util.Locale.ROOT) + "@example.test");
        Role role = new Role();
        role.setName(roleType);
        user.setRole(role);
        CustomUserDetails principal = new CustomUserDetails(user);
        return authentication(new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities()));
    }

    private static void timestamps(com.alahadattars.entity.BaseEntity entity, LocalDateTime now) {
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
    }

    private record Fixture(Product product, ProductVariant variant, Bottle bottle) {
    }
}
