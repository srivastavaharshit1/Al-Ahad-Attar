package com.alahadattars.billing.pos;

import com.alahadattars.billing.discount.DiscountScope;
import com.alahadattars.billing.discount.DiscountType;
import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
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
import com.alahadattars.repository.BottleRepository;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.security.CustomUserDetails;
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
import java.util.List;
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
    void quoteUsesShopkeeperEnteredPricesAndDoesNotChangeStock() {
        Fixture fixture = fixture(ProductType.ATTAR, CategoryType.ATTARS, new BigDecimal("999.00"),
                8, new BigDecimal("99.00"), 6);

        // Shopkeeper enters custom product price (120.00), bottle charge (15.00), gift box charge (10.00), and discount (5.00)
        PosQuoteRequest request = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(),
                        fixture.bottle().getId(), 2, new BigDecimal("120.00"), new BigDecimal("15.00"),
                        new BigDecimal("10.00"), new BigDecimal("5.00"))),
                null, List.of(), List.of(), "Walk-in Customer", null, null);

        PosQuoteResponse quote = quoteService.quote(request, admin());

        assertThat(quote.previewOnly()).isTrue();
        assertThat(quote.adminId()).isEqualTo(77L);
        assertThat(quote.adminEmail()).isEqualTo("admin@example.test");
        // Line subtotal = (120 * 2) + 15 + 10 = 265.00
        assertThat(quote.subtotal()).isEqualByComparingTo("265.00");
        assertThat(quote.totalPromotionDiscount()).isEqualByComparingTo("0.00");
        assertThat(quote.manualDiscount()).isEqualByComparingTo("5.00");
        // Payable = 265 - 5 = 260.00
        assertThat(quote.payableAmount()).isEqualByComparingTo("260.00");
        assertThat(quote.lines()).hasSize(1);
        assertThat(quote.lines().getFirst().variantUnitPrice()).isEqualByComparingTo("120.00");
        assertThat(quote.lines().getFirst().bottleUnitPrice()).isEqualByComparingTo("15.00");
        assertThat(quote.lines().getFirst().giftBoxCharge()).isEqualByComparingTo("10.00");
        assertThat(quote.lines().getFirst().manualDiscount()).isEqualByComparingTo("5.00");
        assertThat(quote.lines().getFirst().finalLineTotal()).isEqualByComparingTo("260.00");
        assertThat(quote.lines().getFirst().available()).isTrue();
        // Catalog stock is unchanged by quote
        assertThat(variantRepository.findById(fixture.variant().getId()).orElseThrow().getStock()).isEqualTo(8);
        assertThat(bottleRepository.findById(fixture.bottle().getId()).orElseThrow().getStockQuantity()).isEqualTo(6);
    }

    @Test
    void posQuoteCompletelyIgnoresOnlinePromotionsAndCoupons() {
        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("999.00"),
                10, null, 0);
        promotion("Online 50% discount", "SAVE50", new BigDecimal("50.00"));

        // Shopkeeper enters product price 100.00 for 1 qty. Even if couponCode is passed, online promotions are ignored.
        PosQuoteRequest request = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(), null, 1,
                        new BigDecimal("100.00"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO)),
                "SAVE50", List.of(), List.of(), "Customer", null, null);

        PosQuoteResponse quote = quoteService.quote(request, admin());

        assertThat(quote.promotionItemDiscount()).isEqualByComparingTo("0.00");
        assertThat(quote.promotionCartDiscount()).isEqualByComparingTo("0.00");
        assertThat(quote.totalPromotionDiscount()).isEqualByComparingTo("0.00");
        assertThat(quote.payableAmount()).isEqualByComparingTo("100.00");
        assertThat(quote.appliedPromotions()).isEmpty();
        assertThat(quote.availablePromotions()).isEmpty();
    }

    @Test
    void quotePreventsNegativeTotalsWhenManualDiscountExceedsSubtotal() {
        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("100.00"),
                10, null, 0);

        // Subtotal = 50.00, shopkeeper enters discount of 80.00
        PosQuoteRequest request = new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-a", fixture.product().getId(), fixture.variant().getId(), null, 1,
                        new BigDecimal("50.00"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("80.00"))),
                null, List.of(), List.of(), null, null, null);

        PosQuoteResponse quote = quoteService.quote(request, admin());

        assertThat(quote.subtotal()).isEqualByComparingTo("50.00");
        assertThat(quote.payableAmount()).isEqualByComparingTo("0.00");
        assertThat(quote.lines().getFirst().finalLineTotal()).isEqualByComparingTo("0.00");
    }

    @Test
    void quoteRejectsVariantProductMismatchAndMissingRequiredBottle() {
        Fixture attar = fixture(ProductType.ATTAR, CategoryType.ATTARS, new BigDecimal("100.00"),
                5, new BigDecimal("5.00"), 5);
        Fixture perfume = fixture(ProductType.PERFUME, CategoryType.PERFUMES, new BigDecimal("200.00"),
                5, null, 0);

        // Mismatched product ID
        assertThatThrownBy(() -> quoteService.quote(new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-1", perfume.product().getId(), attar.variant().getId(),
                        attar.bottle().getId(), 1, new BigDecimal("100.00"))),
                null, List.of(), "Customer", null, null), admin()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Selected variant does not belong to the selected product");

        // Missing required bottle for Attar
        assertThatThrownBy(() -> quoteService.quote(new PosQuoteRequest(
                List.of(new PosQuoteRequest.Line("line-1", attar.product().getId(), attar.variant().getId(),
                        null, 1, new BigDecimal("100.00"))),
                null, List.of(), "Customer", null, null), admin()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("A bottle must be selected for this fragrance");
    }

    @Test
    void postEndpointReturnsAuthoritativeQuoteForShopkeeperPrices() throws Exception {
        Fixture fixture = fixture(ProductType.GENERAL, CategoryType.ATTARS, new BigDecimal("999.00"),
                10, null, 0);

        String payload = """
                {
                  "lines": [
                    {
                      "lineKey": "line-api-test",
                      "productId": %d,
                      "variantId": %d,
                      "quantity": 2,
                      "productPrice": "150.00",
                      "bottleCharge": "0.00",
                      "giftBoxCharge": "25.00",
                      "manualDiscount": "10.00"
                    }
                  ],
                  "customerName": "API Walk-in"
                }
                """.formatted(fixture.product().getId(), fixture.variant().getId());

        mockMvc.perform(post("/api/billing/pos/quotes")
                        .with(adminAuthentication())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previewOnly").value(true))
                .andExpect(jsonPath("$.subtotal").value("325.00")) // (150 * 2) + 25 = 325.00
                .andExpect(jsonPath("$.manualDiscount").value("10.00"))
                .andExpect(jsonPath("$.payableAmount").value("315.00")) // 325 - 10 = 315.00
                .andExpect(jsonPath("$.allLinesAvailable").value(true))
                .andExpect(jsonPath("$.quoteFingerprint").isString());
    }

    private Fixture fixture(ProductType productType, CategoryType categoryType, BigDecimal price,
                            int stock, BigDecimal bottlePrice, int bottleStock) {
        String slug = "pos-quote-" + UUID.randomUUID();
        Category category = Category.builder()
                .name("Cat " + slug).description("Desc " + slug).image("/img.png")
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

    private Promotion promotion(String name, String code, BigDecimal discount) {
        return promotionRepository.save(Promotion.builder()
                .name(name).code(code).description("Test promo")
                .promotionType(PromotionType.CART_DISCOUNT)
                .discountType(com.alahadattars.enums.DiscountType.PERCENTAGE)
                .discountValue(discount).minCartValue(BigDecimal.ZERO).maxDiscountValue(new BigDecimal("500.00"))
                .startDate(LocalDateTime.now().minusDays(1)).endDate(LocalDateTime.now().plusDays(1))
                .priority(1)
                .active(true).build());
    }

    private AuthenticatedBillingAdmin admin() {
        return new AuthenticatedBillingAdmin(77L, "admin@example.test");
    }

    private RequestPostProcessor adminAuthentication() {
        User user = new User();
        user.setId(77L);
        user.setEmail("admin@example.test");
        user.setPassword("hash");
        user.setRole(Role.builder().name(RoleType.ADMIN).build());
        user.setEnabled(true);
        CustomUserDetails principal = new CustomUserDetails(user);
        return authentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private record Fixture(Product product, ProductVariant variant, Bottle bottle) { }
}
