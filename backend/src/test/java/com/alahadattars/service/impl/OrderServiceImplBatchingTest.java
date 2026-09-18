package com.alahadattars.service.impl;

import com.alahadattars.dto.cart.CartItemResponse;
import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.dto.order.OrderItemRequest;
import com.alahadattars.dto.order.OrderRequest;
import com.alahadattars.entity.Bottle;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.Order;
import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.User;
import com.alahadattars.enums.ProductType;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.BottleRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.repository.AddressRepository;
import com.alahadattars.repository.CartRepository;
import com.alahadattars.service.StoreSettingsService;
import com.alahadattars.entity.StoreSettings;
import com.alahadattars.service.PaymentService;
import com.alahadattars.service.PromotionEngineService;
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
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class OrderServiceImplBatchingTest {

    @Mock private PaymentIntentRepository paymentIntentRepository;
    @Mock private ProductVariantRepository variantRepository;
    @Mock private BottleRepository bottleRepository;
    @Mock private PromotionEngineService promotionEngineService;
    @Mock private OrderRepository orderRepository;
    @Mock private UserRepository userRepository;
    @Mock private AddressRepository addressRepository;
    @Mock private CartRepository cartRepository;
    @Mock private StoreSettingsService storeSettingsService;
    @Mock private PaymentService paymentService;
    @Mock private com.alahadattars.service.notification.NotificationService notificationService;
    @Mock private com.alahadattars.service.EmailService emailService;
    @Mock private com.alahadattars.mapper.ProductVariantMapper variantMapper;
    @Mock private com.alahadattars.service.ProductImageResolver productImageResolver;
    
    

    @InjectMocks
    private OrderServiceImpl orderService;

    private User user;
    private PaymentIntent intent;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setEmail("test@test.com");

        intent = new PaymentIntent();
        intent.setUser(user);
        intent.setConsumed(false);
        intent.setAmount(new BigDecimal("60"));
    }

    @Test
    void testCreateOrder_NormalMultiItem_BatchesLookups() {
        OrderRequest request = new OrderRequest();
        request.setRazorpayOrderId("ro_123");
        request.setRazorpayPaymentId("rp_123");

        OrderItemRequest req1 = new OrderItemRequest();
        req1.setVariantId(10L);
        req1.setQuantity(2);
        req1.setFreeItem(false);

        OrderItemRequest req2 = new OrderItemRequest();
        req2.setVariantId(20L);
        req2.setQuantity(1);
        req2.setBottleId(50L);
        req2.setFreeItem(false);

        request.setItems(Arrays.asList(req1, req2));

        org.mockito.Mockito.lenient().when(paymentIntentRepository.findByRazorpayOrderIdForUpdate("ro_123"))
                .thenReturn(Optional.of(intent));
        org.mockito.Mockito.lenient().when(orderRepository.existsByTransactionId("rp_123")).thenReturn(false);
        org.mockito.Mockito.lenient().when(paymentIntentRepository.markConsumed(any(), any(), any())).thenReturn(1);
        org.mockito.Mockito.lenient().when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(user));
        org.mockito.Mockito.lenient().when(userRepository.acquireUserLock(anyString())).thenReturn(1);
        org.mockito.Mockito.lenient().when(addressRepository.findByIdAndUserAndActiveTrue(any(), any())).thenReturn(Optional.of(new com.alahadattars.entity.Address()));
        org.mockito.Mockito.lenient().when(paymentService.verifyPayment(any())).thenReturn(true);
        org.mockito.Mockito.lenient().when(cartRepository.findByUserEmail(any())).thenReturn(Optional.of(new com.alahadattars.entity.Cart()));
        org.mockito.Mockito.lenient().when(storeSettingsService.getSettingsEntity()).thenReturn(new StoreSettings());
        org.mockito.Mockito.lenient().when(orderRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Product p1 = new Product();
        ProductVariant v1 = new ProductVariant();
        v1.setId(10L);
        v1.setPrice(BigDecimal.TEN);
        v1.setProduct(p1);
        v1.setStock(10);
        v1.setProductType(ProductType.PERFUME);

        Product p2 = new Product();
        ProductVariant v2 = new ProductVariant();
        v2.setId(20L);
        v2.setPrice(BigDecimal.TEN);
        v2.setProduct(p2);
        v2.setStock(10);
        v2.setProductType(ProductType.ATTAR);

        Bottle b = new Bottle();
        b.setId(50L);
        b.setPrice(BigDecimal.ONE);
        b.setActive(true);

        org.mockito.Mockito.lenient().when(variantRepository.findAllById(Set.of(10L, 20L))).thenReturn(Arrays.asList(v1, v2));
        org.mockito.Mockito.lenient().when(bottleRepository.findAllById(Set.of(50L))).thenReturn(List.of(b));

        CartResponse eval = new CartResponse();
        CartItemResponse r1 = new CartItemResponse();
        r1.setVariantId(10L);
        r1.setQuantity(2);
        r1.setFinalPrice(BigDecimal.TEN);
        
        CartItemResponse r2 = new CartItemResponse();
        r2.setVariantId(20L);
        r2.setQuantity(1);
        r2.setFinalPrice(BigDecimal.TEN);

        eval.setItems(Arrays.asList(r1, r2));
        eval.setSubtotal(BigDecimal.TEN);
        eval.setItemDiscounts(BigDecimal.ZERO);
        eval.setCartDiscount(BigDecimal.ZERO);
        eval.setTotal(BigDecimal.TEN);
        eval.setAppliedPromotions(java.util.Collections.emptyList());
        eval.setFreeProductOptions(java.util.Collections.emptyList());
        
        eval.setTotal(BigDecimal.TEN);
        eval.setAppliedPromotions(java.util.Collections.emptyList());
        eval.setFreeProductOptions(java.util.Collections.emptyList());
        
        

        org.mockito.Mockito.lenient().when(promotionEngineService.evaluateCart(any(Cart.class), any())).thenReturn(eval);
        org.mockito.Mockito.lenient().when(variantRepository.decrementStock(org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyInt())).thenReturn(1);
        org.mockito.Mockito.lenient().when(addressRepository.findByIdAndUserAndActiveTrue(any(), any())).thenReturn(Optional.of(new com.alahadattars.entity.Address()));
        org.mockito.Mockito.lenient().when(paymentService.verifyPayment(any())).thenReturn(true);
        org.mockito.Mockito.lenient().when(cartRepository.findByUserEmail(any())).thenReturn(Optional.of(new com.alahadattars.entity.Cart()));
        org.mockito.Mockito.lenient().when(storeSettingsService.getSettingsEntity()).thenReturn(new StoreSettings());
        org.mockito.Mockito.lenient().when(orderRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        orderService.createOrder("test@test.com", request);

        // Verify batch queries executed EXACTLY ONCE
        verify(variantRepository, times(1)).findAllById(Set.of(10L, 20L));
        verify(bottleRepository, times(1)).findAllById(Set.of(50L));
    }

    @Test
    void testCreateOrder_MissingVariant_ThrowsResourceNotFound() {
        OrderRequest request = new OrderRequest();
        request.setRazorpayOrderId("ro_123");

        OrderItemRequest req1 = new OrderItemRequest();
        req1.setVariantId(99L);
        request.setItems(List.of(req1));

        org.mockito.Mockito.lenient().when(paymentIntentRepository.findByRazorpayOrderIdForUpdate(anyString()))
                .thenReturn(Optional.of(intent));
        org.mockito.Mockito.lenient().when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(user));
        org.mockito.Mockito.lenient().when(userRepository.acquireUserLock(anyString())).thenReturn(1);
        org.mockito.Mockito.lenient().when(addressRepository.findByIdAndUserAndActiveTrue(any(), any())).thenReturn(Optional.of(new com.alahadattars.entity.Address()));
        org.mockito.Mockito.lenient().when(paymentService.verifyPayment(any())).thenReturn(true);
        org.mockito.Mockito.lenient().when(cartRepository.findByUserEmail(any())).thenReturn(Optional.of(new com.alahadattars.entity.Cart()));
        org.mockito.Mockito.lenient().when(storeSettingsService.getSettingsEntity()).thenReturn(new StoreSettings());
        org.mockito.Mockito.lenient().when(orderRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        org.mockito.Mockito.lenient().when(variantRepository.findAllById(Set.of(99L))).thenReturn(Collections.emptyList());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () -> 
            orderService.createOrder("test@test.com", request)
        );
        assertEquals("Variant not found: 99", ex.getMessage());
    }

    @Test
    void testCreateOrder_MissingBottle_ThrowsResourceNotFound() {
        OrderRequest request = new OrderRequest();
        request.setRazorpayOrderId("ro_123");

        OrderItemRequest req1 = new OrderItemRequest();
        req1.setVariantId(10L);
        req1.setBottleId(99L);
        request.setItems(List.of(req1));

        org.mockito.Mockito.lenient().when(paymentIntentRepository.findByRazorpayOrderIdForUpdate(anyString()))
                .thenReturn(Optional.of(intent));
        org.mockito.Mockito.lenient().when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(user));
        org.mockito.Mockito.lenient().when(userRepository.acquireUserLock(anyString())).thenReturn(1);
        org.mockito.Mockito.lenient().when(addressRepository.findByIdAndUserAndActiveTrue(any(), any())).thenReturn(Optional.of(new com.alahadattars.entity.Address()));
        org.mockito.Mockito.lenient().when(paymentService.verifyPayment(any())).thenReturn(true);
        org.mockito.Mockito.lenient().when(cartRepository.findByUserEmail(any())).thenReturn(Optional.of(new com.alahadattars.entity.Cart()));
        org.mockito.Mockito.lenient().when(storeSettingsService.getSettingsEntity()).thenReturn(new StoreSettings());
        org.mockito.Mockito.lenient().when(orderRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ProductVariant v1 = new ProductVariant();
        v1.setId(10L);
        v1.setPrice(BigDecimal.TEN);
        v1.setProductType(ProductType.ATTAR);
        org.mockito.Mockito.lenient().when(variantRepository.findAllById(Set.of(10L))).thenReturn(List.of(v1));
        org.mockito.Mockito.lenient().when(bottleRepository.findAllById(Set.of(99L))).thenReturn(Collections.emptyList());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () -> 
            orderService.createOrder("test@test.com", request)
        );
        assertEquals("Bottle not found: 99", ex.getMessage());
    }
}
