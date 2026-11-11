package com.alahadattars.service;

import com.alahadattars.entity.Bottle;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.CartItem;
import com.alahadattars.entity.GiftSet;
import com.alahadattars.entity.Order;
import com.alahadattars.entity.OrderItem;
import com.alahadattars.entity.OrderItemGiftSetComponent;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class GiftSetConstraintAndBottleCompatibilityTest {

    @Test
    @DisplayName("Verify Standard Cart Item supports optional bottle selection")
    void testStandardCartItemWithAndWithoutBottle() {
        Product product = Product.builder().name("White Oudh").build();
        ProductVariant variant = ProductVariant.builder().sku("WO-12").price(new BigDecimal("1200.00")).build();
        Bottle bottle = Bottle.builder().name("Crystal Octagon").price(new BigDecimal("250.00")).build();

        // 1. Standard cart item WITH bottle
        CartItem itemWithBottle = CartItem.builder()
                .product(product)
                .variant(variant)
                .bottle(bottle)
                .quantity(1)
                .price(new BigDecimal("1450.00"))
                .build();

        assertThat(itemWithBottle.getProduct()).isNotNull();
        assertThat(itemWithBottle.getVariant()).isNotNull();
        assertThat(itemWithBottle.getBottle()).isNotNull();

        // 2. Standard cart item WITHOUT bottle (e.g. Bakhoor)
        CartItem itemWithoutBottle = CartItem.builder()
                .product(product)
                .variant(variant)
                .bottle(null)
                .quantity(1)
                .price(new BigDecimal("1200.00"))
                .build();

        assertThat(itemWithoutBottle.getProduct()).isNotNull();
        assertThat(itemWithoutBottle.getVariant()).isNotNull();
        assertThat(itemWithoutBottle.getBottle()).isNull();
    }

    @Test
    @DisplayName("Verify Standard Order Item supports optional bottle selection")
    void testStandardOrderItemWithAndWithoutBottle() {
        Order order = new Order();
        ProductVariant variant = ProductVariant.builder().sku("WO-12").price(new BigDecimal("1200.00")).build();

        // Standard order item WITH bottle
        OrderItem orderItemWithBottle = OrderItem.builder()
                .order(order)
                .variant(variant)
                .productName("White Oudh")
                .variantSize("12ml")
                .bottleId(99L)
                .bottleName("Crystal Octagon")
                .bottlePrice(new BigDecimal("250.00"))
                .quantity(1)
                .unitPrice(new BigDecimal("1450.00"))
                .originalPrice(new BigDecimal("1450.00"))
                .discountAmount(BigDecimal.ZERO)
                .subtotal(new BigDecimal("1450.00"))
                .build();

        assertThat(orderItemWithBottle.getVariant()).isNotNull();
        assertThat(orderItemWithBottle.getBottleId()).isEqualTo(99L);
        assertThat(orderItemWithBottle.getBottleName()).isEqualTo("Crystal Octagon");
        assertThat(orderItemWithBottle.getBottlePrice()).isEqualByComparingTo("250.00");

        // Standard order item WITHOUT bottle
        OrderItem orderItemWithoutBottle = OrderItem.builder()
                .order(order)
                .variant(variant)
                .productName("White Oudh")
                .variantSize("12ml")
                .bottleId(null)
                .bottleName(null)
                .bottlePrice(null)
                .quantity(1)
                .unitPrice(new BigDecimal("1200.00"))
                .originalPrice(new BigDecimal("1200.00"))
                .discountAmount(BigDecimal.ZERO)
                .subtotal(new BigDecimal("1200.00"))
                .build();

        assertThat(orderItemWithoutBottle.getVariant()).isNotNull();
        assertThat(orderItemWithoutBottle.getBottleId()).isNull();
        assertThat(orderItemWithoutBottle.getBottleName()).isNull();
        assertThat(orderItemWithoutBottle.getBottlePrice()).isNull();
    }

    @Test
    @DisplayName("Verify Historical Component Snapshot stores immutable variant identifier independently of live entities")
    void testHistoricalComponentSnapshotIndependence() {
        OrderItem orderItem = OrderItem.builder()
                .productName("Royal Oud Gift Set")
                .quantity(2)
                .build();
        orderItem.setId(501L);

        // Snapshot of a component inside the gift set
        OrderItemGiftSetComponent componentSnapshot = OrderItemGiftSetComponent.builder()
                .orderItem(orderItem)
                .giftSetId(10L)
                .productId(88L)
                .productName("Kashmiri Rose")
                .variantId(777L) // Immutable numeric identifier
                .variantSize("6ml")
                .sku("KSH-ROSE-6ML")
                .quantityPerSet(1)
                .totalDeductedQuantity(2)
                .build();

        // Assert: All attributes are self-contained and do NOT rely on a live Product or ProductVariant entity
        assertThat(componentSnapshot.getVariantId()).isEqualTo(777L);
        assertThat(componentSnapshot.getProductId()).isEqualTo(88L);
        assertThat(componentSnapshot.getProductName()).isEqualTo("Kashmiri Rose");
        assertThat(componentSnapshot.getVariantSize()).isEqualTo("6ml");
        assertThat(componentSnapshot.getSku()).isEqualTo("KSH-ROSE-6ML");
        assertThat(componentSnapshot.getQuantityPerSet()).isEqualTo(1);
        assertThat(componentSnapshot.getTotalDeductedQuantity()).isEqualTo(2);
    }
}
