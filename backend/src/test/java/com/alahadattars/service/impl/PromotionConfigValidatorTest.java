package com.alahadattars.service.impl;

import com.alahadattars.dto.promotion.PromotionRequest;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.enums.DiscountType;
import com.alahadattars.enums.PromotionScope;
import com.alahadattars.enums.PromotionType;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromotionConfigValidatorTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @InjectMocks
    private PromotionConfigValidator validator;

    private PromotionRequest.PromotionRequestBuilder baseRequest() {
        return PromotionRequest.builder()
                .name("Test Promo")
                .promotionType(PromotionType.FREE_PRODUCT)
                .discountType(DiscountType.FREE_ITEM)
                .discountValue(BigDecimal.ZERO)
                .priority(1);
    }

    private ProductVariant variantOfSize(String size, boolean active, int stock) {
        ProductVariant v = new ProductVariant();
        v.setId(1L);
        v.setSize(size);
        v.setActive(active);
        v.setStock(stock);
        return v;
    }

    @BeforeEach
    void setUp() {
        lenient().when(categoryRepository.existsById(10L)).thenReturn(true);
        lenient().when(categoryRepository.existsById(999L)).thenReturn(false);
    }

    @Test
    void rejectsStartDateAfterEndDate() {
        PromotionRequest request = baseRequest()
                .startDate(LocalDateTime.now().plusDays(2))
                .endDate(LocalDateTime.now().plusDays(1))
                .configuration(new PromotionConfiguration())
                .build();

        assertThrows(BadRequestException.class, () -> validator.validate(request));
    }

    @Test
    void rejectsPercentageDiscountOver100() {
        PromotionRequest request = PromotionRequest.builder()
                .name("Bad Discount")
                .promotionType(PromotionType.CART_DISCOUNT)
                .discountType(DiscountType.PERCENTAGE)
                .discountValue(new BigDecimal("150"))
                .priority(1)
                .build();

        assertThrows(BadRequestException.class, () -> validator.validate(request));
    }

    @Test
    void rejectsZeroMinPurchaseQuantity() {
        PromotionConfiguration config = new PromotionConfiguration();
        config.setMinPurchaseQuantity(0);
        PromotionRequest request = baseRequest().configuration(config).build();

        assertThrows(BadRequestException.class, () -> validator.validate(request));
    }

    @Test
    void rejectsZeroMaxFreeQuantity() {
        PromotionConfiguration config = new PromotionConfiguration();
        config.setMaxFreeQuantity(0);
        PromotionRequest request = baseRequest().configuration(config).build();

        assertThrows(BadRequestException.class, () -> validator.validate(request));
    }

    @Test
    void rejectsCategoryScopeWithNoCategorySelected() {
        PromotionConfiguration config = new PromotionConfiguration();
        config.setBuyScope(PromotionScope.CATEGORY);
        PromotionRequest request = baseRequest().configuration(config).build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> validator.validate(request));
        assertNoCategorySelectedMessage(ex);
    }

    private void assertNoCategorySelectedMessage(BadRequestException ex) {
        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().toLowerCase().contains("category"));
    }

    @Test
    void rejectsCategoryScopeWithNonExistentCategory() {
        PromotionConfiguration config = new PromotionConfiguration();
        config.setBuyScope(PromotionScope.CATEGORY);
        config.setBuyCategoryId(999L);
        PromotionRequest request = baseRequest().configuration(config).build();

        assertThrows(BadRequestException.class, () -> validator.validate(request));
    }

    @Test
    void rejectsSpecificProductScopeWithNonExistentProduct() {
        when(productRepository.findById(999L)).thenReturn(Optional.empty());
        PromotionConfiguration config = new PromotionConfiguration();
        config.setBuyScope(PromotionScope.SPECIFIC_PRODUCT);
        config.setBuyProductId(999L);
        PromotionRequest request = baseRequest().configuration(config).build();

        assertThrows(BadRequestException.class, () -> validator.validate(request));
    }

    @Test
    void rejectsProductNotBelongingToSelectedCategory() {
        Category actualCategory = new Category();
        actualCategory.setId(20L); // different from the configured buyCategoryId (10)
        Product product = new Product();
        product.setId(5L);
        product.setCategory(actualCategory);
        when(productRepository.findById(5L)).thenReturn(Optional.of(product));

        PromotionConfiguration config = new PromotionConfiguration();
        config.setBuyScope(PromotionScope.SPECIFIC_PRODUCT);
        config.setBuyProductId(5L);
        config.setBuyCategoryId(10L);
        PromotionRequest request = baseRequest().configuration(config).build();

        assertThrows(BadRequestException.class, () -> validator.validate(request));
    }

    @Test
    void rejectsBuyConfigMatchingZeroEligibleProducts() {
        when(productVariantRepository.findEligibleVariantsByCategories(List.of(10L)))
                .thenReturn(List.of(variantOfSize("6 ml", true, 5))); // no 12 ml variant exists
        PromotionConfiguration config = new PromotionConfiguration();
        config.setBuyScope(PromotionScope.CATEGORY);
        config.setBuyCategoryId(10L);
        config.setBuyVariantSizes(List.of("12 ml"));
        PromotionRequest request = baseRequest().configuration(config).build();

        assertThrows(BadRequestException.class, () -> validator.validate(request));
    }

    @Test
    void rejectsFreeConfigMatchingZeroEligibleProducts() {
        when(productVariantRepository.findEligibleVariantsByCategories(anyList()))
                .thenReturn(List.of()); // no eligible products at all
        PromotionConfiguration config = new PromotionConfiguration();
        config.setFreeScope(PromotionScope.CATEGORY);
        config.setFreeCategoryIds(List.of(10L));
        config.setFreeVariantSizes(List.of("3 ml"));
        PromotionRequest request = baseRequest().configuration(config).build();

        assertThrows(BadRequestException.class, () -> validator.validate(request));
    }

    @Test
    void acceptsValidCategoryScopedConfig() {
        when(productVariantRepository.findEligibleVariantsByCategories(List.of(10L)))
                .thenReturn(List.of(variantOfSize("12 ml", true, 5)));
        PromotionConfiguration config = new PromotionConfiguration();
        config.setBuyScope(PromotionScope.CATEGORY);
        config.setBuyCategoryId(10L);
        config.setBuyVariantSizes(List.of("12 ml"));
        config.setMinPurchaseQuantity(3);
        config.setMaxFreeQuantity(1);
        PromotionRequest request = baseRequest().configuration(config).build();

        assertDoesNotThrow(() -> validator.validate(request));
    }

    @Test
    void skipsScopeValidationForLegacyNullScopeConfigs() {
        // Configs created before buyScope/freeScope existed must keep saving without the new checks.
        PromotionConfiguration config = new PromotionConfiguration();
        config.setBuyCategoryId(10L);
        config.setAllowedFreeVariantSize("3 ml");
        PromotionRequest request = baseRequest().configuration(config).build();

        assertDoesNotThrow(() -> validator.validate(request));
    }
}
