package com.alahadattars.service;

import com.alahadattars.entity.GiftSet;
import com.alahadattars.entity.GiftSetItem;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.service.impl.GiftSetServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class GiftSetAvailabilityTest {

    @InjectMocks
    private GiftSetServiceImpl giftSetService;

    private Product product;
    private ProductVariant variantA;
    private ProductVariant variantB;

    @BeforeEach
    void setUp() {
        product = Product.builder()
                .name("Test Fragrance")
                .active(true)
                .build();

        variantA = ProductVariant.builder()
                .product(product)
                .size("12ml")
                .sku("VAR-A-12ML")
                .stock(10)
                .active(true)
                .price(new BigDecimal("1200.00"))
                .build();

        variantB = ProductVariant.builder()
                .product(product)
                .size("6ml")
                .sku("VAR-B-6ML")
                .stock(6)
                .active(true)
                .price(new BigDecimal("650.00"))
                .build();
    }

    @Test
    @DisplayName("Availability should be bottlenecked by the lowest ratio (variantStock / requiredQty)")
    void testBottleneckAvailabilityCalculation() {
        GiftSet giftSet = GiftSet.builder()
                .name("Royal Duo Set")
                .slug("royal-duo-set")
                .price(new BigDecimal("2199.00"))
                .active(true)
                .items(new ArrayList<>())
                .build();

        // Needs 1x variantA (stock 10) -> can make 10 sets
        // Needs 2x variantB (stock 6)  -> can make 6 / 2 = 3 sets
        giftSet.addItem(GiftSetItem.builder().variant(variantA).product(product).quantity(1).build());
        giftSet.addItem(GiftSetItem.builder().variant(variantB).product(product).quantity(2).build());

        int available = giftSetService.calculateAvailableStock(giftSet);
        assertThat(available).isEqualTo(3);
    }

    @Test
    @DisplayName("Availability should be zero if any single component has zero stock")
    void testZeroStockComponentYieldsZeroAvailable() {
        variantB.setStock(0);

        GiftSet giftSet = GiftSet.builder()
                .name("Royal Duo Set")
                .slug("royal-duo-set")
                .price(new BigDecimal("2199.00"))
                .active(true)
                .items(new ArrayList<>())
                .build();

        giftSet.addItem(GiftSetItem.builder().variant(variantA).product(product).quantity(1).build());
        giftSet.addItem(GiftSetItem.builder().variant(variantB).product(product).quantity(1).build());

        int available = giftSetService.calculateAvailableStock(giftSet);
        assertThat(available).isEqualTo(0);
    }

    @Test
    @DisplayName("Availability should be zero if a component variant is inactive")
    void testInactiveVariantYieldsZeroAvailable() {
        variantA.setActive(false);

        GiftSet giftSet = GiftSet.builder()
                .name("Royal Duo Set")
                .slug("royal-duo-set")
                .price(new BigDecimal("2199.00"))
                .active(true)
                .items(new ArrayList<>())
                .build();

        giftSet.addItem(GiftSetItem.builder().variant(variantA).product(product).quantity(1).build());

        int available = giftSetService.calculateAvailableStock(giftSet);
        assertThat(available).isEqualTo(0);
    }

    @Test
    @DisplayName("Availability should be zero if the gift set itself is deactivated")
    void testInactiveGiftSetYieldsZeroAvailable() {
        GiftSet giftSet = GiftSet.builder()
                .name("Royal Duo Set")
                .slug("royal-duo-set")
                .price(new BigDecimal("2199.00"))
                .active(false)
                .items(new ArrayList<>())
                .build();

        giftSet.addItem(GiftSetItem.builder().variant(variantA).product(product).quantity(1).build());

        int available = giftSetService.calculateAvailableStock(giftSet);
        assertThat(available).isEqualTo(0);
    }

    @Test
    @DisplayName("Availability should be zero if the gift set has no items")
    void testEmptyItemsYieldsZeroAvailable() {
        GiftSet giftSet = GiftSet.builder()
                .name("Empty Set")
                .slug("empty-set")
                .price(new BigDecimal("999.00"))
                .active(true)
                .items(new ArrayList<>())
                .build();

        int available = giftSetService.calculateAvailableStock(giftSet);
        assertThat(available).isEqualTo(0);
    }
}

