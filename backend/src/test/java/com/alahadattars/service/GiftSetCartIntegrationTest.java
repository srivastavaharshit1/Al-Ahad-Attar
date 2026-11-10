package com.alahadattars.service;

import com.alahadattars.dto.cart.CartItemRequest;
import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.dto.cart.GuestCartRequest;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.CartItem;
import com.alahadattars.entity.GiftSet;
import com.alahadattars.entity.GiftSetItem;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.User;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.CartRepository;
import com.alahadattars.repository.GiftSetRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.service.impl.CartServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Gift Set Cart Integration & Validation Tests")
class GiftSetCartIntegrationTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private PromotionEngineService promotionEngineService;

    @Mock
    private BottleService bottleService;

    @Mock
    private GiftSetRepository giftSetRepository;

    @Mock
    private GiftSetService giftSetService;

    @InjectMocks
    private CartServiceImpl cartService;

    private User testUser;
    private Cart testCart;
    private GiftSet royalOudSet;
    private ProductVariant oud12ml;
    private ProductVariant musk6ml;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .email("customer@alahadattars.com")
                .firstName("Zayd")
                .lastName("Hassan")
                .build();
        testUser.setId(101L);

        testCart = Cart.builder()
                .user(testUser)
                .items(new ArrayList<>())
                .build();
        testCart.setId(201L);

        Product oudProduct = Product.builder().name("Royal Oud").build();
        oudProduct.setId(1L);
        oud12ml = ProductVariant.builder()
                .product(oudProduct)
                .size("12ml")
                .price(new BigDecimal("1500.00"))
                .stock(10)
                .active(true)
                .build();
        oud12ml.setId(11L);

        Product muskProduct = Product.builder().name("White Musk").build();
        muskProduct.setId(2L);
        musk6ml = ProductVariant.builder()
                .product(muskProduct)
                .size("6ml")
                .price(new BigDecimal("800.00"))
                .stock(6)
                .active(true)
                .build();
        musk6ml.setId(12L);

        royalOudSet = GiftSet.builder()
                .name("Royal Oud & Musk Collection")
                .slug("royal-oud-musk-collection")
                .price(new BigDecimal("3500.00"))
                .salePrice(new BigDecimal("3199.00"))
                .active(true)
                .items(new ArrayList<>())
                .build();
        royalOudSet.setId(301L);

        GiftSetItem item1 = GiftSetItem.builder()
                .giftSet(royalOudSet)
                .product(oudProduct)
                .variant(oud12ml)
                .quantity(1)
                .build();
        GiftSetItem item2 = GiftSetItem.builder()
                .giftSet(royalOudSet)
                .product(muskProduct)
                .variant(musk6ml)
                .quantity(2)
                .build();
        royalOudSet.getItems().add(item1);
        royalOudSet.getItems().add(item2);
    }

    @Nested
    @DisplayName("Add Gift Set to Authenticated Cart")
    class AddGiftSetToCartTests {

        @Test
        @DisplayName("Successfully add Gift Set to cart with authoritative server sale price")
        void addGiftSet_Success() {
            CartItemRequest request = CartItemRequest.builder()
                    .giftSetId(301L)
                    .quantity(2)
                    .build();

            when(cartRepository.findByUserEmail(testUser.getEmail())).thenReturn(Optional.of(testCart));
            when(giftSetRepository.findByIdWithItemsEager(301L)).thenReturn(Optional.of(royalOudSet));
            when(giftSetService.calculateAvailableStock(royalOudSet)).thenReturn(3); // musk 6 / 2 = 3 bottleneck
            when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(promotionEngineService.evaluateCart(any(Cart.class), any())).thenReturn(CartResponse.builder().build());

            cartService.addToCart(testUser.getEmail(), request);

            assertThat(testCart.getItems()).hasSize(1);
            CartItem added = testCart.getItems().get(0);
            assertThat(added.isGiftSet()).isTrue();
            assertThat(added.getGiftSet().getId()).isEqualTo(301L);
            assertThat(added.getVariant()).isNull();
            assertThat(added.getProduct()).isNull();
            assertThat(added.getBottle()).isNull();
            assertThat(added.getQuantity()).isEqualTo(2);
            assertThat(added.getPrice()).isEqualByComparingTo("3199.00");
        }

        @Test
        @DisplayName("Reject adding Gift Set when bottleId is supplied (bottle selection forbidden for gift sets)")
        void addGiftSet_RejectBottleSelection() {
            CartItemRequest request = CartItemRequest.builder()
                    .giftSetId(301L)
                    .quantity(1)
                    .bottleId(99L)
                    .build();

            when(cartRepository.findByUserEmail(testUser.getEmail())).thenReturn(Optional.of(testCart));

            assertThatThrownBy(() -> cartService.addToCart(testUser.getEmail(), request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Bottle selection is not allowed for Gift Sets");
        }

        @Test
        @DisplayName("Reject adding Gift Set when both variantId and giftSetId are provided")
        void addGiftSet_RejectAmbiguousPayload() {
            CartItemRequest request = CartItemRequest.builder()
                    .giftSetId(301L)
                    .variantId(11L)
                    .quantity(1)
                    .build();

            when(cartRepository.findByUserEmail(testUser.getEmail())).thenReturn(Optional.of(testCart));

            assertThatThrownBy(() -> cartService.addToCart(testUser.getEmail(), request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Cannot specify both variantId and giftSetId");
        }

        @Test
        @DisplayName("Reject adding Gift Set when requested quantity exceeds available stock")
        void addGiftSet_RejectInsufficientStock() {
            CartItemRequest request = CartItemRequest.builder()
                    .giftSetId(301L)
                    .quantity(5)
                    .build();

            when(cartRepository.findByUserEmail(testUser.getEmail())).thenReturn(Optional.of(testCart));
            when(giftSetRepository.findByIdWithItemsEager(301L)).thenReturn(Optional.of(royalOudSet));
            when(giftSetService.calculateAvailableStock(royalOudSet)).thenReturn(3);

            assertThatThrownBy(() -> cartService.addToCart(testUser.getEmail(), request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Insufficient stock");
        }

        @Test
        @DisplayName("Reject adding inactive Gift Set")
        void addGiftSet_RejectInactive() {
            royalOudSet.setActive(false);
            CartItemRequest request = CartItemRequest.builder()
                    .giftSetId(301L)
                    .quantity(1)
                    .build();

            when(cartRepository.findByUserEmail(testUser.getEmail())).thenReturn(Optional.of(testCart));
            when(giftSetRepository.findByIdWithItemsEager(301L)).thenReturn(Optional.of(royalOudSet));

            assertThatThrownBy(() -> cartService.addToCart(testUser.getEmail(), request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Gift Set is not available");
        }

        @Test
        @DisplayName("Merge quantity when adding an existing Gift Set line up to available stock")
        void addGiftSet_MergeExistingQuantity() {
            CartItem existingItem = CartItem.builder()
                    .cart(testCart)
                    .isGiftSet(true)
                    .giftSet(royalOudSet)
                    .quantity(1)
                    .price(new BigDecimal("3199.00"))
                    .build();
            testCart.addItem(existingItem);

            CartItemRequest request = CartItemRequest.builder()
                    .giftSetId(301L)
                    .quantity(2)
                    .build();

            when(cartRepository.findByUserEmail(testUser.getEmail())).thenReturn(Optional.of(testCart));
            when(giftSetRepository.findByIdWithItemsEager(301L)).thenReturn(Optional.of(royalOudSet));
            when(giftSetService.calculateAvailableStock(royalOudSet)).thenReturn(3);
            when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(promotionEngineService.evaluateCart(any(Cart.class), any())).thenReturn(CartResponse.builder().build());

            cartService.addToCart(testUser.getEmail(), request);

            assertThat(testCart.getItems()).hasSize(1);
            assertThat(testCart.getItems().get(0).getQuantity()).isEqualTo(3);
        }
    }

    @Nested
    @DisplayName("Update Gift Set Quantity in Cart")
    class UpdateQuantityTests {

        @Test
        @DisplayName("Successfully update Gift Set quantity within available stock")
        void updateQuantity_Success() {
            CartItem giftSetCartItem = CartItem.builder()
                    .cart(testCart)
                    .isGiftSet(true)
                    .giftSet(royalOudSet)
                    .quantity(1)
                    .price(new BigDecimal("3199.00"))
                    .build();
            giftSetCartItem.setId(501L);
            testCart.addItem(giftSetCartItem);

            when(cartRepository.findByUserEmail(testUser.getEmail())).thenReturn(Optional.of(testCart));
            when(giftSetRepository.findByIdWithItemsEager(301L)).thenReturn(Optional.of(royalOudSet));
            when(giftSetService.calculateAvailableStock(royalOudSet)).thenReturn(4);
            when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(promotionEngineService.evaluateCart(any(Cart.class), any())).thenReturn(CartResponse.builder().build());

            cartService.updateQuantity(testUser.getEmail(), 501L, 3);

            assertThat(giftSetCartItem.getQuantity()).isEqualTo(3);
        }

        @Test
        @DisplayName("Reject updating Gift Set quantity beyond available stock")
        void updateQuantity_RejectBeyondStock() {
            CartItem giftSetCartItem = CartItem.builder()
                    .cart(testCart)
                    .isGiftSet(true)
                    .giftSet(royalOudSet)
                    .quantity(1)
                    .price(new BigDecimal("3199.00"))
                    .build();
            giftSetCartItem.setId(501L);
            testCart.addItem(giftSetCartItem);

            when(cartRepository.findByUserEmail(testUser.getEmail())).thenReturn(Optional.of(testCart));
            when(giftSetRepository.findByIdWithItemsEager(301L)).thenReturn(Optional.of(royalOudSet));
            when(giftSetService.calculateAvailableStock(royalOudSet)).thenReturn(2);

            assertThatThrownBy(() -> cartService.updateQuantity(testUser.getEmail(), 501L, 4))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Insufficient stock");
        }

        @Test
        @DisplayName("Remove Gift Set item when quantity is updated to 0")
        void updateQuantity_RemoveWhenZero() {
            CartItem giftSetCartItem = CartItem.builder()
                    .cart(testCart)
                    .isGiftSet(true)
                    .giftSet(royalOudSet)
                    .quantity(1)
                    .price(new BigDecimal("3199.00"))
                    .build();
            giftSetCartItem.setId(501L);
            testCart.addItem(giftSetCartItem);

            when(cartRepository.findByUserEmail(testUser.getEmail())).thenReturn(Optional.of(testCart));
            when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(promotionEngineService.evaluateCart(any(Cart.class), any())).thenReturn(CartResponse.builder().build());

            cartService.updateQuantity(testUser.getEmail(), 501L, 0);

            assertThat(testCart.getItems()).isEmpty();
        }
    }

    @Nested
    @DisplayName("Guest Cart Evaluation with Mixed Items")
    class GuestCartEvaluationTests {

        @Test
        @DisplayName("Successfully evaluate mixed guest cart containing standard item and gift set")
        void evaluateGuestCart_MixedItems_Success() {
            GuestCartRequest request = GuestCartRequest.builder()
                    .items(List.of(
                            GuestCartRequest.GuestCartItemRequest.builder()
                                    .productId(1L)
                                    .variantId(11L)
                                    .quantity(1)
                                    .build(),
                            GuestCartRequest.GuestCartItemRequest.builder()
                                    .giftSetId(301L)
                                    .isGiftSet(true)
                                    .quantity(2)
                                    .build()
                    ))
                    .build();

            when(giftSetRepository.findAllByIdWithItemsEager(any())).thenReturn(List.of(royalOudSet));
            when(productVariantRepository.findAllById(any())).thenReturn(List.of(oud12ml));
            when(promotionEngineService.evaluateCart(any(Cart.class), any())).thenAnswer(invocation -> {
                Cart evaluatedCart = invocation.getArgument(0);
                assertThat(evaluatedCart.getItems()).hasSize(2);
                CartItem std = evaluatedCart.getItems().stream().filter(i -> !i.isGiftSet()).findFirst().orElseThrow();
                CartItem gs = evaluatedCart.getItems().stream().filter(CartItem::isGiftSet).findFirst().orElseThrow();
                assertThat(std.getVariant().getId()).isEqualTo(11L);
                assertThat(gs.getGiftSet().getId()).isEqualTo(301L);
                return CartResponse.builder().build();
            });

            cartService.evaluateGuestCart(request);

            verify(promotionEngineService).evaluateCart(any(Cart.class), any());
        }

        @Test
        @DisplayName("Reject guest cart item when gift set bottle selection is attempted")
        void evaluateGuestCart_RejectGiftSetBottleSelection() {
            GuestCartRequest request = GuestCartRequest.builder()
                    .items(List.of(
                            GuestCartRequest.GuestCartItemRequest.builder()
                                    .giftSetId(301L)
                                    .isGiftSet(true)
                                    .quantity(1)
                                    .bottleId(50L)
                                    .build()
                    ))
                    .build();

            when(giftSetRepository.findAllByIdWithItemsEager(any())).thenReturn(List.of(royalOudSet));

            assertThatThrownBy(() -> cartService.evaluateGuestCart(request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Bottle selection is not allowed for Gift Sets");
        }
    }
}

