package com.alahadattars.service.impl;

import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.dto.cart.FreeProductOptionResponse;
import com.alahadattars.dto.promotion.PromotionResponse;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.CartItem;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.enums.PromotionScope;
import com.alahadattars.enums.PromotionType;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRepository;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class PromotionEngineServiceTest {

    @Mock
    private PromotionRepository promotionRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private PromotionResponseMapper promotionResponseMapper;

    @InjectMocks
    private PromotionEngineServiceImpl promotionEngineService;

    private Cart cart;
    private Promotion promoDiscount;
    private Promotion promoFree;
    private ProductVariant variant;

    @BeforeEach
    void setUp() {
        cart = new Cart();
        cart.setId(1L);
        cart.setItems(new ArrayList<>());

        Category category = new Category();
        category.setId(10L);
        category.setName("Attar");

        Product product = new Product();
        product.setId(100L);
        product.setCategory(category);
        product.setName("Test Product");

        variant = new ProductVariant();
        variant.setId(1000L);
        variant.setProduct(product);
        variant.setPrice(new BigDecimal("1000"));
        variant.setSize("12 ml");
        variant.setStock(10);
        variant.setActive(true);

        CartItem cartItem = new CartItem();
        cartItem.setId(1L);
        cartItem.setCart(cart);
        cartItem.setVariant(variant);
        cartItem.setProduct(product);
        cartItem.setQuantity(2);
        cartItem.setPrice(variant.getPrice());
        cartItem.setFreeItem(false);

        cart.addItem(cartItem);

        promoDiscount = new Promotion();
        promoDiscount.setId(1L);
        promoDiscount.setName("10% OFF");
        promoDiscount.setPromotionType(PromotionType.PRODUCT_DISCOUNT);
        promoDiscount.setActive(true);
        promoDiscount.setStackable(false);
        promoDiscount.setPriority(10);
        promoDiscount.setDiscountType(com.alahadattars.enums.DiscountType.PERCENTAGE);
        promoDiscount.setDiscountValue(new BigDecimal("10"));
        PromotionConfiguration config1 = new PromotionConfiguration();
        promoDiscount.setConfiguration(config1);

        promoFree = new Promotion();
        promoFree.setId(2L);
        promoFree.setName("Free Gift");
        promoFree.setPromotionType(PromotionType.FREE_PRODUCT);
        promoFree.setActive(true);
        PromotionConfiguration config2 = new PromotionConfiguration();
        config2.setFreeCategoryIds(List.of(10L));
        config2.setAllowedFreeVariantSize("3 ml");
        promoFree.setConfiguration(config2);

        // Not every test exercises evaluateCart's response-mapping path — lenient so the unused
        // stub doesn't trip MockitoExtension's strict-stubbing check on those tests.
        org.mockito.Mockito.lenient().when(promotionResponseMapper.toResponse(any(Promotion.class)))
                .thenAnswer(invocation -> PromotionResponse.fromEntity(invocation.getArgument(0)));
    }

    @Test
    void testEvaluateCart_AppliesDiscount() {
        when(promotionRepository.findActiveAutomaticPromotions(any(LocalDateTime.class)))
                .thenReturn(List.of(promoDiscount));

        CartResponse response = promotionEngineService.evaluateCart(cart, null);

        assertNotNull(response);
        assertEquals(new BigDecimal("2000"), response.getSubtotal());
        assertEquals(new BigDecimal("200.00"), response.getItemDiscounts()); // 10% of 2000
        assertEquals(new BigDecimal("1800.00"), response.getTotal());
        assertEquals(1, response.getAppliedPromotions().size());
        assertEquals("10% OFF", response.getAppliedPromotions().get(0).getName());
    }

    @Test
    void testEvaluateFreeProductOptions() {
        when(promotionRepository.findAllActivePromotions(any(LocalDateTime.class)))
                .thenReturn(List.of(promoFree));

        ProductVariant freeVariant = new ProductVariant();
        freeVariant.setId(2000L);
        freeVariant.setSize("3 ml");
        freeVariant.setProduct(variant.getProduct());
        freeVariant.setStock(10);
        
        when(productVariantRepository.findEligibleFreeVariants(anyList(), eq("3 ml")))
                .thenReturn(List.of(freeVariant));

        List<FreeProductOptionResponse> options = promotionEngineService.evaluateFreeProductOptions(cart, null);

        assertNotNull(options);
        assertEquals(1, options.size());
        assertEquals("3 ml", options.get(0).getVariant());
        assertEquals(promoFree.getId(), options.get(0).getPromotionId());
    }

    @Test
    void testValidateFreeItemEligibility_Success() {
        when(promotionRepository.findById(promoFree.getId())).thenReturn(Optional.of(promoFree));
        
        ProductVariant freeVariant = new ProductVariant();
        freeVariant.setId(2000L);
        freeVariant.setSize("3 ml");
        freeVariant.setProduct(variant.getProduct());
        freeVariant.setStock(10);

        when(productVariantRepository.findById(2000L)).thenReturn(Optional.of(freeVariant));

        assertDoesNotThrow(() -> {
            promotionEngineService.validateFreeItemEligibility(cart, promoFree.getId(), 2000L);
        });
    }

    @Test
    void testValidateFreeItemEligibility_FailsWhenVariantNotEligible() {
        when(promotionRepository.findById(promoFree.getId())).thenReturn(Optional.of(promoFree));
        
        ProductVariant freeVariant = new ProductVariant();
        freeVariant.setId(3000L);
        freeVariant.setSize("12 ml"); // not 3 ml
        freeVariant.setProduct(variant.getProduct());
        freeVariant.setStock(10);

        when(productVariantRepository.findById(3000L)).thenReturn(Optional.of(freeVariant));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> {
            promotionEngineService.validateFreeItemEligibility(cart, promoFree.getId(), 3000L);
        });

        assertTrue(ex.getMessage().contains("is not eligible"));
    }

    // ------------------------------------------------------------------
    // Explicit-scope buy-side qualification
    // ------------------------------------------------------------------

    private ProductVariant freeVariantOfSize(String size) {
        ProductVariant v = new ProductVariant();
        v.setId(2000L);
        v.setSize(size);
        v.setProduct(variant.getProduct());
        v.setStock(10);
        v.setActive(true);
        return v;
    }

    private void mockFreeCategoryMatch(String size) {
        when(promotionRepository.findAllActivePromotions(any(LocalDateTime.class))).thenReturn(List.of(promoFree));
        when(productVariantRepository.findEligibleVariantsByCategories(anyList())).thenReturn(List.of(freeVariantOfSize(size)));
    }

    @Test
    void anyProductInCategory_matchingSizeAndQuantity_qualifies() {
        promoFree.getConfiguration().setBuyScope(PromotionScope.CATEGORY);
        promoFree.getConfiguration().setBuyCategoryId(10L);
        promoFree.getConfiguration().setBuyVariantSizes(List.of("12 ml"));
        promoFree.getConfiguration().setMinPurchaseQuantity(2);
        promoFree.getConfiguration().setFreeScope(PromotionScope.CATEGORY);
        promoFree.getConfiguration().setFreeVariantSizes(List.of("3 ml"));
        mockFreeCategoryMatch("3 ml");

        List<FreeProductOptionResponse> options = promotionEngineService.evaluateFreeProductOptions(cart, null);

        assertEquals(1, options.size());
    }

    @Test
    void specificProduct_matchingSizeAndQuantity_qualifies() {
        promoFree.getConfiguration().setBuyScope(PromotionScope.SPECIFIC_PRODUCT);
        promoFree.getConfiguration().setBuyProductId(100L);
        promoFree.getConfiguration().setBuyVariantSizes(List.of("12 ml"));
        promoFree.getConfiguration().setMinPurchaseQuantity(2);
        promoFree.getConfiguration().setFreeScope(PromotionScope.CATEGORY);
        promoFree.getConfiguration().setFreeVariantSizes(List.of("3 ml"));
        mockFreeCategoryMatch("3 ml");

        List<FreeProductOptionResponse> options = promotionEngineService.evaluateFreeProductOptions(cart, null);

        assertEquals(1, options.size());
    }

    @Test
    void buySizeMismatch_doesNotQualify() {
        promoFree.getConfiguration().setBuyScope(PromotionScope.ANY_PRODUCT);
        promoFree.getConfiguration().setBuyVariantSizes(List.of("6 ml")); // cart item is 12 ml
        promoFree.getConfiguration().setMinPurchaseQuantity(1);
        when(promotionRepository.findAllActivePromotions(any(LocalDateTime.class))).thenReturn(List.of(promoFree));

        List<FreeProductOptionResponse> options = promotionEngineService.evaluateFreeProductOptions(cart, null);

        assertTrue(options.isEmpty());
    }

    @Test
    void quantityBelowThreshold_doesNotQualify() {
        promoFree.getConfiguration().setBuyScope(PromotionScope.ANY_PRODUCT);
        promoFree.getConfiguration().setBuyVariantSizes(List.of("12 ml"));
        promoFree.getConfiguration().setMinPurchaseQuantity(3); // cart only has qty 2
        when(promotionRepository.findAllActivePromotions(any(LocalDateTime.class))).thenReturn(List.of(promoFree));

        List<FreeProductOptionResponse> options = promotionEngineService.evaluateFreeProductOptions(cart, null);

        assertTrue(options.isEmpty());
    }

    @Test
    void quantityExactlyAtThreshold_qualifies() {
        promoFree.getConfiguration().setBuyScope(PromotionScope.ANY_PRODUCT);
        promoFree.getConfiguration().setBuyVariantSizes(List.of("12 ml"));
        promoFree.getConfiguration().setMinPurchaseQuantity(2); // cart has exactly qty 2
        promoFree.getConfiguration().setFreeScope(PromotionScope.CATEGORY);
        promoFree.getConfiguration().setFreeVariantSizes(List.of("3 ml"));
        mockFreeCategoryMatch("3 ml");

        List<FreeProductOptionResponse> options = promotionEngineService.evaluateFreeProductOptions(cart, null);

        assertEquals(1, options.size());
    }

    @Test
    void crossProduct_sameCategoryAndSize_quantitiesSum() {
        Product otherProduct = new Product();
        otherProduct.setId(101L);
        otherProduct.setCategory(variant.getProduct().getCategory());
        ProductVariant otherVariant = new ProductVariant();
        otherVariant.setId(1001L);
        otherVariant.setProduct(otherProduct);
        otherVariant.setSize("12 ml");
        otherVariant.setPrice(new BigDecimal("500"));

        CartItem otherItem = new CartItem();
        otherItem.setId(2L);
        otherItem.setCart(cart);
        otherItem.setVariant(otherVariant);
        otherItem.setProduct(otherProduct);
        otherItem.setQuantity(1);
        otherItem.setPrice(otherVariant.getPrice());
        otherItem.setFreeItem(false);
        cart.addItem(otherItem);

        promoFree.getConfiguration().setBuyScope(PromotionScope.CATEGORY);
        promoFree.getConfiguration().setBuyCategoryId(10L);
        promoFree.getConfiguration().setBuyVariantSizes(List.of("12 ml"));
        promoFree.getConfiguration().setMinPurchaseQuantity(3); // 2 (product 100) + 1 (product 101) = 3
        promoFree.getConfiguration().setFreeScope(PromotionScope.CATEGORY);
        promoFree.getConfiguration().setFreeVariantSizes(List.of("3 ml"));
        mockFreeCategoryMatch("3 ml");

        List<FreeProductOptionResponse> options = promotionEngineService.evaluateFreeProductOptions(cart, null);

        assertEquals(1, options.size());
    }

    @Test
    void specificProductScope_otherProductsDoNotContribute() {
        promoFree.getConfiguration().setBuyScope(PromotionScope.SPECIFIC_PRODUCT);
        promoFree.getConfiguration().setBuyProductId(999L); // not the cart's product (100)
        promoFree.getConfiguration().setBuyVariantSizes(List.of("12 ml"));
        promoFree.getConfiguration().setMinPurchaseQuantity(1);
        when(promotionRepository.findAllActivePromotions(any(LocalDateTime.class))).thenReturn(List.of(promoFree));

        List<FreeProductOptionResponse> options = promotionEngineService.evaluateFreeProductOptions(cart, null);

        assertTrue(options.isEmpty());
    }

    @Test
    void categoryScope_otherCategoryDoesNotContributeToQuantity() {
        Category perfumeCategory = new Category();
        perfumeCategory.setId(20L);
        perfumeCategory.setName("Perfume");
        Product perfumeProduct = new Product();
        perfumeProduct.setId(200L);
        perfumeProduct.setCategory(perfumeCategory);
        ProductVariant perfumeVariant = new ProductVariant();
        perfumeVariant.setId(2001L);
        perfumeVariant.setProduct(perfumeProduct);
        perfumeVariant.setSize("12 ml");
        perfumeVariant.setPrice(new BigDecimal("500"));

        CartItem perfumeItem = new CartItem();
        perfumeItem.setId(2L);
        perfumeItem.setCart(cart);
        perfumeItem.setVariant(perfumeVariant);
        perfumeItem.setProduct(perfumeProduct);
        perfumeItem.setQuantity(5); // would push total to 7 if wrongly counted
        perfumeItem.setPrice(perfumeVariant.getPrice());
        perfumeItem.setFreeItem(false);
        cart.addItem(perfumeItem);

        promoFree.getConfiguration().setBuyScope(PromotionScope.CATEGORY);
        promoFree.getConfiguration().setBuyCategoryId(10L); // Attar only
        promoFree.getConfiguration().setBuyVariantSizes(List.of("12 ml"));
        promoFree.getConfiguration().setMinPurchaseQuantity(3); // Attar alone (qty 2) is short of 3
        when(promotionRepository.findAllActivePromotions(any(LocalDateTime.class))).thenReturn(List.of(promoFree));

        List<FreeProductOptionResponse> options = promotionEngineService.evaluateFreeProductOptions(cart, null);

        assertTrue(options.isEmpty(), "Perfume-category item must not count toward an Attar-only qualification");
    }

    @Test
    void multiSizeBuyList_matchesEitherConfiguredSize() {
        promoFree.getConfiguration().setBuyScope(PromotionScope.ANY_PRODUCT);
        promoFree.getConfiguration().setBuyVariantSizes(List.of("6 ml", "12 ml")); // cart item is 12 ml
        promoFree.getConfiguration().setMinPurchaseQuantity(2);
        promoFree.getConfiguration().setFreeScope(PromotionScope.CATEGORY);
        promoFree.getConfiguration().setFreeVariantSizes(List.of("3 ml"));
        mockFreeCategoryMatch("3 ml");

        List<FreeProductOptionResponse> options = promotionEngineService.evaluateFreeProductOptions(cart, null);

        assertEquals(1, options.size());
    }

    // ------------------------------------------------------------------
    // Explicit-scope free-gift eligibility
    // ------------------------------------------------------------------

    @Test
    void multiSizeFreeList_onlyMatchingSizeVariantsOffered() {
        promoFree.getConfiguration().setFreeScope(PromotionScope.CATEGORY);
        promoFree.getConfiguration().setFreeCategoryIds(List.of(10L));
        promoFree.getConfiguration().setFreeVariantSizes(List.of("3 ml", "6 ml"));

        ProductVariant matching3ml = freeVariantOfSize("3 ml");
        ProductVariant nonMatching12ml = freeVariantOfSize("12 ml");
        nonMatching12ml.setId(2002L);

        when(promotionRepository.findAllActivePromotions(any(LocalDateTime.class))).thenReturn(List.of(promoFree));
        when(productVariantRepository.findEligibleVariantsByCategories(anyList()))
                .thenReturn(List.of(matching3ml, nonMatching12ml));

        List<FreeProductOptionResponse> options = promotionEngineService.evaluateFreeProductOptions(cart, null);

        assertEquals(1, options.size());
        assertEquals("3 ml", options.get(0).getVariant());
    }

    @Test
    void freeScopeSpecificProduct_offersOnlyThatProductsVariants() {
        promoFree.getConfiguration().setFreeScope(PromotionScope.SPECIFIC_PRODUCT);
        promoFree.getConfiguration().setFreeProductIds(List.of(500L));
        promoFree.getConfiguration().setFreeVariantSizes(List.of("3 ml"));

        when(promotionRepository.findAllActivePromotions(any(LocalDateTime.class))).thenReturn(List.of(promoFree));
        when(productVariantRepository.findEligibleVariantsByProducts(List.of(500L)))
                .thenReturn(List.of(freeVariantOfSize("3 ml")));

        List<FreeProductOptionResponse> options = promotionEngineService.evaluateFreeProductOptions(cart, null);

        assertEquals(1, options.size());
    }

    @Test
    void freeScopeAnyProduct_filtersInactiveAndOutOfStockCandidates() {
        promoFree.getConfiguration().setFreeScope(PromotionScope.ANY_PRODUCT);
        promoFree.getConfiguration().setFreeVariantSizes(List.of("3 ml"));

        ProductVariant valid = freeVariantOfSize("3 ml");

        ProductVariant outOfStock = freeVariantOfSize("3 ml");
        outOfStock.setId(2003L);
        outOfStock.setStock(0);

        Product inactiveProduct = new Product();
        inactiveProduct.setId(300L);
        inactiveProduct.setActive(false);
        ProductVariant inactiveProductVariant = freeVariantOfSize("3 ml");
        inactiveProductVariant.setId(2004L);
        inactiveProductVariant.setProduct(inactiveProduct);

        when(promotionRepository.findAllActivePromotions(any(LocalDateTime.class))).thenReturn(List.of(promoFree));
        when(productVariantRepository.findByActiveTrue())
                .thenReturn(List.of(valid, outOfStock, inactiveProductVariant));

        List<FreeProductOptionResponse> options = promotionEngineService.evaluateFreeProductOptions(cart, null);

        assertEquals(1, options.size());
        assertEquals(valid.getId(), options.get(0).getVariantId());
    }

    @Test
    void validateFreeItemEligibility_rejectsOutOfStockVariant() {
        when(promotionRepository.findById(promoFree.getId())).thenReturn(Optional.of(promoFree));
        ProductVariant outOfStock = freeVariantOfSize("3 ml");
        outOfStock.setStock(0);
        when(productVariantRepository.findById(2000L)).thenReturn(Optional.of(outOfStock));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> promotionEngineService.validateFreeItemEligibility(cart, promoFree.getId(), 2000L));

        assertTrue(ex.getMessage().toLowerCase().contains("out of stock"));
    }

    @Test
    void validateFreeItemEligibility_scopeAware_rejectsWrongSize() {
        promoFree.getConfiguration().setFreeScope(PromotionScope.CATEGORY);
        promoFree.getConfiguration().setFreeCategoryIds(List.of(10L));
        promoFree.getConfiguration().setFreeVariantSizes(List.of("3 ml"));
        when(promotionRepository.findById(promoFree.getId())).thenReturn(Optional.of(promoFree));
        ProductVariant wrongSize = freeVariantOfSize("12 ml");
        when(productVariantRepository.findById(2000L)).thenReturn(Optional.of(wrongSize));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> promotionEngineService.validateFreeItemEligibility(cart, promoFree.getId(), 2000L));

        assertTrue(ex.getMessage().contains("is not eligible"));
    }

    // ------------------------------------------------------------------
    // isFreeCartItemStillValid (CartServiceImpl's stale-item prune, bug fix verification)
    // ------------------------------------------------------------------

    @Test
    void isFreeCartItemStillValid_true_forFreeVariantIdsBasedItem() {
        // Regression check: this previously always returned false for freeVariantIds-based free
        // items, since the old code only ever checked allowedFreeVariantSize.
        promoFree.getConfiguration().setFreeVariantIds(List.of(2000L));
        when(promotionRepository.findById(promoFree.getId())).thenReturn(Optional.of(promoFree));

        ProductVariant freeVariant = freeVariantOfSize("12 ml"); // size irrelevant when freeVariantIds is set
        CartItem freeItem = new CartItem();
        freeItem.setId(99L);
        freeItem.setCart(cart);
        freeItem.setVariant(freeVariant);
        freeItem.setProduct(freeVariant.getProduct());
        freeItem.setQuantity(1);
        freeItem.setPrice(BigDecimal.ZERO);
        freeItem.setFreeItem(true);
        freeItem.setFreePromotionId(promoFree.getId());

        assertTrue(promotionEngineService.isFreeCartItemStillValid(cart, freeItem));
    }

    @Test
    void isFreeCartItemStillValid_false_whenQualifyingItemNoLongerInCart() {
        Cart emptyCart = new Cart();
        emptyCart.setId(2L);
        emptyCart.setItems(new ArrayList<>());
        promoFree.getConfiguration().setMinPurchaseQuantity(1);
        when(promotionRepository.findById(promoFree.getId())).thenReturn(Optional.of(promoFree));

        ProductVariant freeVariant = freeVariantOfSize("3 ml");
        CartItem freeItem = new CartItem();
        freeItem.setId(99L);
        freeItem.setCart(emptyCart);
        freeItem.setVariant(freeVariant);
        freeItem.setProduct(freeVariant.getProduct());
        freeItem.setQuantity(1);
        freeItem.setPrice(BigDecimal.ZERO);
        freeItem.setFreeItem(true);
        freeItem.setFreePromotionId(promoFree.getId());
        emptyCart.addItem(freeItem);

        assertFalse(promotionEngineService.isFreeCartItemStillValid(emptyCart, freeItem));
    }

    // ------------------------------------------------------------------
    // Inactive / expired / usage-limit — defensive re-check inside evaluateCart
    // ------------------------------------------------------------------

    @Test
    void evaluateCart_inactivePromotion_neverApplied() {
        promoDiscount.setActive(false);
        when(promotionRepository.findActiveAutomaticPromotions(any(LocalDateTime.class)))
                .thenReturn(List.of(promoDiscount));

        CartResponse response = promotionEngineService.evaluateCart(cart, null);

        assertTrue(response.getAppliedPromotions().isEmpty());
    }

    @Test
    void evaluateCart_expiredPromotion_neverApplied() {
        promoDiscount.setEndDate(LocalDateTime.now().minusDays(1));
        when(promotionRepository.findActiveAutomaticPromotions(any(LocalDateTime.class)))
                .thenReturn(List.of(promoDiscount));

        CartResponse response = promotionEngineService.evaluateCart(cart, null);

        assertTrue(response.getAppliedPromotions().isEmpty());
    }

    @Test
    void evaluateCart_usageLimitExhausted_neverApplied() {
        promoDiscount.setUsageLimit(5);
        promoDiscount.setUsedCount(5);
        when(promotionRepository.findActiveAutomaticPromotions(any(LocalDateTime.class)))
                .thenReturn(List.of(promoDiscount));

        CartResponse response = promotionEngineService.evaluateCart(cart, null);

        assertTrue(response.getAppliedPromotions().isEmpty());
    }
}
