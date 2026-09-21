package com.alahadattars.service.impl;

import com.alahadattars.dto.product.ProductSummaryResponse;
import com.alahadattars.dto.variant.VariantResponse;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.enums.DiscountType;
import com.alahadattars.enums.ProductType;
import com.alahadattars.enums.PromotionType;
import com.alahadattars.mapper.CategoryMapper;
import com.alahadattars.mapper.ProductImageMapper;
import com.alahadattars.mapper.ProductMapper;
import com.alahadattars.mapper.ProductVariantMapper;
import com.alahadattars.repository.PromotionRedemptionRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.service.ProductImageResolver;
import com.alahadattars.service.StorageService;
import com.alahadattars.service.promotion.EligibilityConditionFactory;
import com.alahadattars.service.promotion.ItemEligibilityCondition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class EffectivePricingFeatureTest {

    @Mock
    private PromotionRepository promotionRepository;

    @Mock
    private PromotionRedemptionRepository promotionRedemptionRepository;

    @Mock
    private EligibilityConditionFactory eligibilityConditionFactory;

    @Mock
    private ItemEligibilityCondition itemEligibilityCondition;

    @Mock
    private CategoryMapper categoryMapper;

    @Mock
    private ProductImageMapper productImageMapper;

    @Mock
    private StorageService storageService;

    @Mock
    private ProductImageResolver productImageResolver;

    @InjectMocks
    private PromotionEngineServiceImpl promotionEngineService;

    private ProductVariantMapper productVariantMapper;
    private ProductMapper productMapper;

    private Product testProduct;
    private ProductVariant variantA;
    private ProductVariant variantB;

    @BeforeEach
    void setUp() {
        // Initialize mappers manually to test their integration
        productVariantMapper = new ProductVariantMapper(productImageMapper, promotionEngineService);
        productMapper = new ProductMapper(categoryMapper, productVariantMapper, storageService, productImageResolver, promotionEngineService);

        Category category = new Category();
        category.setId(1L);
        category.setName("Perfumes");

        testProduct = new Product();
        testProduct.setId(100L);
        testProduct.setName("Test Product");
        testProduct.setCategory(category);
        testProduct.setActive(true);

        variantA = new ProductVariant();
        variantA.setId(10L);
        variantA.setProductType(ProductType.PERFUME);
        variantA.setSize("50ml");
        variantA.setPrice(new BigDecimal("500.00"));
        variantA.setStock(10);
        variantA.setActive(true);
        variantA.setProduct(testProduct);

        variantB = new ProductVariant();
        variantB.setId(11L);
        variantB.setProductType(ProductType.PERFUME);
        variantB.setSize("100ml");
        variantB.setPrice(new BigDecimal("2500.00"));
        variantB.setStock(5);
        variantB.setActive(true);
        variantB.setProduct(testProduct);

        testProduct.setVariants(Arrays.asList(variantA, variantB));
    }

    @Test
    void test1_noPromotion() {
        // TEST 1 — No promotion
        // Given: originalPrice = 2500, No applicable promotion.
        BigDecimal originalPrice = new BigDecimal("2500.00");
        List<Promotion> activePromotions = Collections.emptyList();

        BigDecimal effectivePrice = promotionEngineService.calculateBestProductPrice(testProduct, originalPrice, activePromotions);

        // Expected: effectivePrice = 2500
        assertEquals(0, new BigDecimal("2500.00").compareTo(effectivePrice));

        // Ensure no repository calls
        verifyNoInteractions(promotionRepository);
    }

    @Test
    void test2_percentageProductDiscount() {
        // TEST 2 — Percentage product discount
        // Given: originalPrice = 2500, 10% product discount
        BigDecimal originalPrice = new BigDecimal("2500.00");

        Promotion promo = new Promotion();
        promo.setPromotionType(PromotionType.PRODUCT_DISCOUNT);
        promo.setDiscountType(DiscountType.PERCENTAGE);
        promo.setDiscountValue(new BigDecimal("10.00"));
        promo.setActive(true);
        PromotionConfiguration config = new PromotionConfiguration();
        config.setApplicableProductIds(Collections.singletonList(100L));
        promo.setConfiguration(config);

        List<Promotion> activePromotions = Collections.singletonList(promo);

        when(eligibilityConditionFactory.getCondition(promo)).thenReturn(itemEligibilityCondition);
        when(itemEligibilityCondition.isProductEligible(promo, testProduct)).thenReturn(true);

        BigDecimal effectivePrice = promotionEngineService.calculateBestProductPrice(testProduct, originalPrice, activePromotions);

        // Expected: effectivePrice = 2250
        assertEquals(0, new BigDecimal("2250.00").compareTo(effectivePrice));

        // Ensure no repository calls
        verifyNoInteractions(promotionRepository);
    }

    @Test
    void test3_multipleVariants() {
        // TEST 3 — Multiple variants
        // Given: Variant A (500), Variant B (2500)
        // Apply the same 10% product promotion
        Promotion promo = new Promotion();
        promo.setPromotionType(PromotionType.PRODUCT_DISCOUNT);
        promo.setDiscountType(DiscountType.PERCENTAGE);
        promo.setDiscountValue(new BigDecimal("10.00"));
        promo.setActive(true);
        PromotionConfiguration config = new PromotionConfiguration();
        config.setApplicableProductIds(Collections.singletonList(100L));
        promo.setConfiguration(config);

        List<Promotion> activePromotions = Collections.singletonList(promo);

        when(eligibilityConditionFactory.getCondition(promo)).thenReturn(itemEligibilityCondition);
        when(itemEligibilityCondition.isProductEligible(promo, testProduct)).thenReturn(true);

        BigDecimal effectivePriceA = promotionEngineService.calculateBestProductPrice(variantA.getProduct(), variantA.getPrice(), activePromotions);
        BigDecimal effectivePriceB = promotionEngineService.calculateBestProductPrice(variantB.getProduct(), variantB.getPrice(), activePromotions);

        // Verify each variant receives its own effective price based on its own base price
        // 500 -> 450
        assertEquals(0, new BigDecimal("450.00").compareTo(effectivePriceA));
        // 2500 -> 2250
        assertEquals(0, new BigDecimal("2250.00").compareTo(effectivePriceB));
    }

    @Test
    void test4_inactiveOrNonApplicablePromotion() {
        // TEST 4 — Inactive/non-applicable promotion
        // Given: originalPrice = 2500, Promotion is inactive or product is not eligible.
        BigDecimal originalPrice = new BigDecimal("2500.00");

        Promotion promo = new Promotion();
        promo.setPromotionType(PromotionType.PRODUCT_DISCOUNT);
        promo.setDiscountType(DiscountType.PERCENTAGE);
        promo.setDiscountValue(new BigDecimal("10.00"));
        promo.setActive(true); // Active globally but product not eligible

        List<Promotion> activePromotions = Collections.singletonList(promo);

        when(eligibilityConditionFactory.getCondition(promo)).thenReturn(itemEligibilityCondition);
        when(itemEligibilityCondition.isProductEligible(promo, testProduct)).thenReturn(false);

        BigDecimal effectivePrice = promotionEngineService.calculateBestProductPrice(testProduct, originalPrice, activePromotions);

        // Expected: effectivePrice = 2500
        assertEquals(0, new BigDecimal("2500.00").compareTo(effectivePrice));
    }

    @Test
    void test5_mapperIntegration() {
        // TEST 5 — Mapper integration
        // Verify ProductVariantMapper correctly maps price and effectivePrice
        Promotion promo = new Promotion();
        promo.setPromotionType(PromotionType.PRODUCT_DISCOUNT);
        promo.setDiscountType(DiscountType.PERCENTAGE);
        promo.setDiscountValue(new BigDecimal("20.00"));
        promo.setActive(true);

        List<Promotion> activePromotions = Collections.singletonList(promo);

        when(eligibilityConditionFactory.getCondition(promo)).thenReturn(itemEligibilityCondition);
        when(itemEligibilityCondition.isProductEligible(promo, testProduct)).thenReturn(true);

        VariantResponse responseA = productVariantMapper.toResponse(variantA, activePromotions);
        VariantResponse responseB = productVariantMapper.toResponse(variantB, activePromotions);

        // variantA: 500 -> 400
        assertEquals(0, new BigDecimal("500.00").compareTo(responseA.getPrice()));
        assertEquals(0, new BigDecimal("400.00").compareTo(responseA.getEffectivePrice()));

        // variantB: 2500 -> 2000
        assertEquals(0, new BigDecimal("2500.00").compareTo(responseB.getPrice()));
        assertEquals(0, new BigDecimal("2000.00").compareTo(responseB.getEffectivePrice()));
    }

    @Test
    void test6_productSummary() {
        // TEST 6 — Product summary
        // Verify ProductSummaryResponse contains minimumPrice and effectiveMinimumPrice
        Promotion promo = new Promotion();
        promo.setPromotionType(PromotionType.PRODUCT_DISCOUNT);
        promo.setDiscountType(DiscountType.PERCENTAGE);
        promo.setDiscountValue(new BigDecimal("50.00")); // 50% discount
        promo.setActive(true);

        List<Promotion> activePromotions = Collections.singletonList(promo);

        when(eligibilityConditionFactory.getCondition(promo)).thenReturn(itemEligibilityCondition);
        when(itemEligibilityCondition.isProductEligible(promo, testProduct)).thenReturn(true);

        ProductSummaryResponse summary = productMapper.toSummaryResponse(testProduct, "PERFUME", activePromotions);

        // Minimum base price is 500 (variantA)
        // 50% discount on 500 = 250
        assertEquals(0, new BigDecimal("500.00").compareTo(summary.getMinimumPrice()));
        assertEquals(0, new BigDecimal("250.00").compareTo(summary.getEffectiveMinimumPrice()));
    }

    @Test
    void test7_preFetchedPromotionOverload() {
        // TEST 7 — Pre-fetched promotion overload
        // Directly test calculateBestProductPrice(product, originalPrice, activePromotions)
        // Confirm it performs the calculation using the supplied promotion list.
        // The test MUST NOT require a promotion repository call.
        BigDecimal originalPrice = new BigDecimal("1000.00");

        Promotion promo = new Promotion();
        promo.setPromotionType(PromotionType.PRODUCT_DISCOUNT);
        promo.setDiscountType(DiscountType.FIXED_AMOUNT);
        promo.setDiscountValue(new BigDecimal("100.00")); // 100 off
        promo.setActive(true);

        List<Promotion> activePromotions = Collections.singletonList(promo);

        when(eligibilityConditionFactory.getCondition(promo)).thenReturn(itemEligibilityCondition);
        when(itemEligibilityCondition.isProductEligible(promo, testProduct)).thenReturn(true);

        BigDecimal effectivePrice = promotionEngineService.calculateBestProductPrice(testProduct, originalPrice, activePromotions);

        // 1000 - 100 = 900
        assertEquals(0, new BigDecimal("900.00").compareTo(effectivePrice));

        // Ensure no DB queries were made during this evaluation
        verifyNoInteractions(promotionRepository);
    }
}
