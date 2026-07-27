package com.alahadattars.service.impl;

import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.dto.cart.FreeProductOptionResponse;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.CartItem;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.enums.PromotionType;
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

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            promotionEngineService.validateFreeItemEligibility(cart, promoFree.getId(), 3000L);
        });
        
        assertTrue(ex.getMessage().contains("is not eligible"));
    }
}
