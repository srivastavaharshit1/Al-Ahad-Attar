package com.alahadattars.service.migration;

import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.CartItem;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.enums.DiscountType;
import com.alahadattars.enums.PromotionType;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.service.impl.PromotionEngineServiceImpl;
import com.alahadattars.service.impl.PromotionResponseMapper;
import com.alahadattars.service.promotion.EligibilityConditionFactory;
import com.alahadattars.service.promotion.LegacyCategoryDiscountCondition;
import com.alahadattars.service.promotion.LegacyProductDiscountCondition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class BuyProductIdMigrationServiceTest {

    @Mock private PromotionRepository promotionRepository;
    @Mock private ProductVariantRepository productVariantRepository;

    // For evaluating semantic equivalence
    @Mock private com.alahadattars.repository.OrderRepository orderRepository;
    @Mock private PromotionResponseMapper promotionResponseMapper;
    @Mock private EligibilityConditionFactory eligibilityConditionFactory;

    @InjectMocks private PromotionEngineServiceImpl promotionEngineService;

    private BuyProductIdMigrationService migrationService;

    private Product productA;
    private Product productB;

    private ProductVariant variant3ml;
    private ProductVariant variant6ml;
    private ProductVariant variant12ml;

    private ProductVariant variantB;

    @BeforeEach
    void setUp() {
        migrationService = new BuyProductIdMigrationService(promotionRepository, productVariantRepository);

        Category cat = new Category();
        cat.setId(10L);

        productA = new Product();
        productA.setId(100L);
        productA.setCategory(cat);

        productB = new Product();
        productB.setId(200L);
        productB.setCategory(cat);

        variant3ml = new ProductVariant();
        variant3ml.setId(101L);
        variant3ml.setProduct(productA);
        variant3ml.setSize("3ml");
        variant3ml.setPrice(new BigDecimal("300"));
        variant3ml.setActive(true);

        variant6ml = new ProductVariant();
        variant6ml.setId(102L);
        variant6ml.setProduct(productA);
        variant6ml.setSize("6ml"); // No space so exact match works in legacy
        variant6ml.setPrice(new BigDecimal("600"));
        variant6ml.setActive(true);

        variant12ml = new ProductVariant();
        variant12ml.setId(103L);
        variant12ml.setProduct(productA);
        variant12ml.setSize("12ml");
        variant12ml.setPrice(new BigDecimal("1200"));
        variant12ml.setActive(true);

        variantB = new ProductVariant();
        variantB.setId(201L);
        variantB.setProduct(productB);
        variantB.setSize("12ml");
        variantB.setPrice(new BigDecimal("500"));
        variantB.setActive(true);

        lenient().when(productVariantRepository.findAll()).thenReturn(List.of(variant3ml, variant6ml, variant12ml, variantB));
        lenient().when(productVariantRepository.findEligibleFreeVariantsByIds(List.of(201L))).thenReturn(List.of(variantB));

        // Let the engine think productCondition matches so it can process BUY_X_GET_Y correctly
        LegacyProductDiscountCondition productCondition = new LegacyProductDiscountCondition();
        lenient().when(eligibilityConditionFactory.getCondition(any())).thenReturn(productCondition);

        lenient().when(promotionResponseMapper.toResponse(any(Promotion.class)))
                .thenAnswer(invocation -> com.alahadattars.dto.promotion.PromotionResponse.fromEntity(invocation.getArgument(0)));
    }

    private Promotion createLegacyPromo() {
        Promotion promo = new Promotion();
        promo.setId(1L);
        promo.setName("TEST PROMO");
        promo.setActive(true);
        // Using FREE_PRODUCT because buyProductId and buyVariantSize are only evaluated here
        promo.setPromotionType(PromotionType.FREE_PRODUCT);

        PromotionConfiguration config = new PromotionConfiguration();
        config.setMinPurchaseQuantity(1); // Buy 1
        config.setMaxFreeQuantity(1); // Get 1
        config.setFreeVariantIds(List.of(201L));
        promo.setConfiguration(config);

        return promo;
    }

    private Cart createCart(ProductVariant... variants) {
        Cart cart = new Cart();
        cart.setId(1L);
        cart.setItems(new ArrayList<>());
        for (ProductVariant v : variants) {
            CartItem item = new CartItem();
            item.setId((long) cart.getItems().size() + 1);
            item.setCart(cart);
            item.setVariant(v);
            item.setProduct(v.getProduct());
            item.setQuantity(1);
            item.setPrice(v.getPrice());
            item.setFreeItem(false);
            cart.addItem(item);
        }
        return cart;
    }

    // TEST A: Specific size restriction
    @Test
    void testA_SpecificSizeRestriction() {
        Promotion promo = createLegacyPromo();
        promo.getConfiguration().setBuyProductId(100L);
        promo.getConfiguration().setBuyVariantSize("6ml");

        lenient().when(promotionRepository.findAll()).thenReturn(List.of(promo));
        lenient().when(promotionRepository.findAllActivePromotions(any(LocalDateTime.class))).thenReturn(List.of(promo));

        // Cart has variant3ml. 3ml does NOT match the 6ml buy condition.
        Cart cartFail = createCart(variant3ml);
        CartResponse responseBeforeFail = promotionEngineService.evaluateCart(cartFail, null);
        assertTrue(responseBeforeFail.getFreeProductOptions().isEmpty());

        // Cart has variant6ml. 6ml MATCHES.
        Cart cartPass = createCart(variant6ml);
        CartResponse responseBeforePass = promotionEngineService.evaluateCart(cartPass, null);
        assertFalse(responseBeforePass.getFreeProductOptions().isEmpty());

        // MIGRATION EXECUTION
        BuyProductIdMigrationService.MigrationReport report = migrationService.execute();
        assertEquals(1, report.safe());

        BuyProductIdMigrationService.MigrationResult result = report.results().get(0);
        assertEquals(BuyProductIdMigrationService.MigrationClassification.SAFE_TO_CONVERT, result.classification());
        assertEquals(List.of(102L), result.proposedVariantIds());

        // Apply proposed migration JSON
        promo.getConfiguration().setBuyVariantIds(result.proposedVariantIds());
        promo.getConfiguration().setBuyScope(com.alahadattars.enums.PromotionScope.SPECIFIC_PRODUCT);

        // AFTER MIGRATION: 3ml should still fail
        CartResponse responseAfterFail = promotionEngineService.evaluateCart(cartFail, null);
        assertTrue(responseAfterFail.getFreeProductOptions().isEmpty());

        // AFTER MIGRATION: 6ml should still pass
        CartResponse responseAfterPass = promotionEngineService.evaluateCart(cartPass, null);
        assertFalse(responseAfterPass.getFreeProductOptions().isEmpty());
    }

    // TEST B: Whitespace normalization
    @Test
    void testB_WhitespaceNormalization() {
        // Change variant12ml to have internal spaces for this test specifically
        variant12ml.setSize("12 ml");

        Promotion promo = createLegacyPromo();
        promo.getConfiguration().setBuyProductId(100L);
        // Legacy promo has "12 ml"
        promo.getConfiguration().setBuyVariantSize("12 ml");

        lenient().when(promotionRepository.findAll()).thenReturn(List.of(promo));
        lenient().when(promotionRepository.findAllActivePromotions(any(LocalDateTime.class))).thenReturn(List.of(promo));

        Cart cartPass = createCart(variant12ml); // "12 ml" matches "12 ml"
        CartResponse responseBeforePass = promotionEngineService.evaluateCart(cartPass, null);
        assertFalse(responseBeforePass.getFreeProductOptions().isEmpty());

        BuyProductIdMigrationService.MigrationReport report = migrationService.execute();
        assertEquals(1, report.safe());

        BuyProductIdMigrationService.MigrationResult result = report.results().get(0);
        assertEquals(List.of(103L), result.proposedVariantIds());

        promo.getConfiguration().setBuyVariantIds(result.proposedVariantIds());
        promo.getConfiguration().setBuyScope(com.alahadattars.enums.PromotionScope.SPECIFIC_PRODUCT);

        CartResponse responseAfterPass = promotionEngineService.evaluateCart(cartPass, null);
        assertFalse(responseAfterPass.getFreeProductOptions().isEmpty());
    }

    // TEST C: No size restrictions
    @Test
    void testC_NoSizeRestriction() {
        Promotion promo = createLegacyPromo();
        promo.getConfiguration().setBuyProductId(100L);

        lenient().when(promotionRepository.findAll()).thenReturn(List.of(promo));
        lenient().when(promotionRepository.findAllActivePromotions(any(LocalDateTime.class))).thenReturn(List.of(promo));

        Cart cartPass1 = createCart(variant3ml);
        Cart cartPass2 = createCart(variant6ml);

        CartResponse responseBeforePass1 = promotionEngineService.evaluateCart(cartPass1, null);
        CartResponse responseBeforePass2 = promotionEngineService.evaluateCart(cartPass2, null);

        assertFalse(responseBeforePass1.getFreeProductOptions().isEmpty());
        assertFalse(responseBeforePass2.getFreeProductOptions().isEmpty());

        BuyProductIdMigrationService.MigrationReport report = migrationService.execute();
        assertEquals(1, report.safe());

        BuyProductIdMigrationService.MigrationResult result = report.results().get(0);
        assertEquals(List.of(101L, 102L, 103L), result.proposedVariantIds());

        promo.getConfiguration().setBuyVariantIds(result.proposedVariantIds());
        promo.getConfiguration().setBuyScope(com.alahadattars.enums.PromotionScope.SPECIFIC_PRODUCT);

        CartResponse responseAfterPass1 = promotionEngineService.evaluateCart(cartPass1, null);
        CartResponse responseAfterPass2 = promotionEngineService.evaluateCart(cartPass2, null);

        assertFalse(responseAfterPass1.getFreeProductOptions().isEmpty());
        assertFalse(responseAfterPass2.getFreeProductOptions().isEmpty());
    }

    // TEST C2: Multiple size restrictions
    @Test
    void testC2_MultipleSizeRestrictions() {
        Promotion promo = createLegacyPromo();
        promo.getConfiguration().setBuyProductId(100L);
        promo.getConfiguration().setBuyVariantSizes(List.of(" 3ml ", "12ml"));

        lenient().when(promotionRepository.findAll()).thenReturn(List.of(promo));

        BuyProductIdMigrationService.MigrationReport report = migrationService.execute();
        assertEquals(1, report.safe());

        BuyProductIdMigrationService.MigrationResult result = report.results().get(0);
        assertEquals(BuyProductIdMigrationService.MigrationClassification.SAFE_TO_CONVERT, result.classification());
        assertEquals(List.of(101L, 103L), result.proposedVariantIds());
    }

    // TEST D: Missing product
    @Test
    void testD_MissingProduct() {
        Promotion promo = createLegacyPromo();
        promo.getConfiguration().setBuyProductId(999L);

        lenient().when(promotionRepository.findAll()).thenReturn(List.of(promo));

        BuyProductIdMigrationService.MigrationReport report = migrationService.execute();
        assertEquals(1, report.cannotConvert());
        assertEquals(BuyProductIdMigrationService.MigrationClassification.CANNOT_CONVERT, report.results().get(0).classification());
    }

    // TEST E: Zero variants match size restriction
    @Test
    void testE_ZeroVariants() {
        Promotion promo = createLegacyPromo();
        promo.getConfiguration().setBuyProductId(100L);
        promo.getConfiguration().setBuyVariantSize("999ml"); // no variant has this size

        lenient().when(promotionRepository.findAll()).thenReturn(List.of(promo));

        BuyProductIdMigrationService.MigrationReport report = migrationService.execute();
        assertEquals(1, report.cannotConvert());
        assertEquals(BuyProductIdMigrationService.MigrationClassification.CANNOT_CONVERT, report.results().get(0).classification());
    }

    // TEST F: Existing conflicting buyVariantIds
    @Test
    void testF_ConflictingBuyVariantIds() {
        Promotion promo = createLegacyPromo();
        promo.getConfiguration().setBuyProductId(100L);
        promo.getConfiguration().setBuyVariantIds(List.of(101L, 999L));

        lenient().when(promotionRepository.findAll()).thenReturn(List.of(promo));

        BuyProductIdMigrationService.MigrationReport report = migrationService.execute();
        assertEquals(1, report.manualReview());
        assertEquals(BuyProductIdMigrationService.MigrationClassification.MANUAL_REVIEW, report.results().get(0).classification());
    }

    // TEST G: buyCategoryId presence
    @Test
    void testG_BuyCategoryIdPresence() {
        Promotion promo = createLegacyPromo();
        promo.getConfiguration().setBuyProductId(100L);
        promo.getConfiguration().setBuyCategoryId(10L);

        lenient().when(promotionRepository.findAll()).thenReturn(List.of(promo));

        BuyProductIdMigrationService.MigrationReport report = migrationService.execute();
        assertEquals(1, report.manualReview());
        assertEquals(BuyProductIdMigrationService.MigrationClassification.MANUAL_REVIEW, report.results().get(0).classification());
    }

    // TEST H: Idempotency
    @Test
    void testH_Idempotency() {
        Promotion promo = createLegacyPromo();
        promo.getConfiguration().setBuyProductId(100L);
        promo.getConfiguration().setBuyVariantIds(List.of(101L, 102L, 103L)); // Exact match for safe
        promo.getConfiguration().setBuyScope(com.alahadattars.enums.PromotionScope.SPECIFIC_PRODUCT);

        lenient().when(promotionRepository.findAll()).thenReturn(List.of(promo));

        BuyProductIdMigrationService.MigrationReport report = migrationService.execute();
        assertEquals(1, report.alreadyMigrated());
        assertEquals(BuyProductIdMigrationService.MigrationClassification.ALREADY_MIGRATED, report.results().get(0).classification());
    }
}
