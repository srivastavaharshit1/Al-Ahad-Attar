package com.alahadattars.service.impl;

import com.alahadattars.dto.cart.GuestCartRequest;
import com.alahadattars.entity.Bottle;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.enums.CategoryType;
import com.alahadattars.enums.ProductType;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.service.BottleService;
import com.alahadattars.service.PromotionEngineService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class CartServiceImplBatchingTest {

    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private PromotionEngineService promotionEngineService;
    @Mock private BottleService bottleService;

    @InjectMocks
    private CartServiceImpl cartService;

    @Test
    void testEvaluateGuestCart_NormalMultiItem_BatchesLookups() {
        GuestCartRequest request = new GuestCartRequest();
        
        GuestCartRequest.GuestCartItemRequest req1 = new GuestCartRequest.GuestCartItemRequest();
        req1.setVariantId(10L);
        req1.setQuantity(1);
        
        GuestCartRequest.GuestCartItemRequest req2 = new GuestCartRequest.GuestCartItemRequest();
        req2.setVariantId(20L);
        req2.setBottleId(50L);
        req2.setQuantity(2);
        
        request.setItems(Arrays.asList(req1, req2));

        Product p1 = new Product();
        Category c1 = new Category();
        c1.setType(CategoryType.PERFUMES);
        p1.setCategory(c1);
        
        ProductVariant v1 = new ProductVariant();
        v1.setId(10L);
        v1.setPrice(BigDecimal.TEN);
        v1.setProduct(p1);

        Product p2 = new Product();
        Category c2 = new Category();
        c2.setType(CategoryType.ATTARS);
        p2.setCategory(c2);
        
        ProductVariant v2 = new ProductVariant();
        v2.setId(20L);
        v2.setPrice(BigDecimal.TEN);
        v2.setProduct(p2);
        v2.setProductType(ProductType.ATTAR);

        Bottle b = new Bottle();
        b.setId(50L);
        b.setPrice(BigDecimal.ONE);
        b.setActive(true);

        when(productVariantRepository.findAllById(Set.of(10L, 20L))).thenReturn(Arrays.asList(v1, v2));
        when(bottleService.getBottleEntitiesByIds(Set.of(50L))).thenReturn(List.of(b));

        cartService.evaluateGuestCart(request);

        verify(productVariantRepository, times(1)).findAllById(Set.of(10L, 20L));
        verify(bottleService, times(1)).getBottleEntitiesByIds(Set.of(50L));
    }
    
    @Test
    void testEvaluateGuestCart_MissingBottle_ThrowsResourceNotFound() {
        GuestCartRequest request = new GuestCartRequest();
        GuestCartRequest.GuestCartItemRequest req1 = new GuestCartRequest.GuestCartItemRequest();
        req1.setVariantId(10L);
        req1.setBottleId(99L);
        request.setItems(List.of(req1));

        Product p1 = new Product();
        Category c1 = new Category();
        c1.setType(CategoryType.ATTARS);
        p1.setCategory(c1);
        
        ProductVariant v1 = new ProductVariant();
        v1.setId(10L);
        v1.setPrice(BigDecimal.TEN);
        v1.setProduct(p1);
        
        when(productVariantRepository.findAllById(Set.of(10L))).thenReturn(List.of(v1));
        when(bottleService.getBottleEntitiesByIds(Set.of(99L))).thenReturn(Collections.emptyList());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () -> 
            cartService.evaluateGuestCart(request)
        );
        assertEquals("Bottle not found with id: 99", ex.getMessage());
    }
}
