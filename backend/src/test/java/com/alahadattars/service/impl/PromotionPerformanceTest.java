package com.alahadattars.service.impl;

import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.CartItem;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.enums.PromotionType;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.service.PromotionEngineService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class PromotionPerformanceTest {

    @Autowired
    private PromotionEngineService promotionEngineService;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    private Cart largeCart;

    @BeforeEach
    void setUp() {
        Category category = categoryRepository.save(Category.builder().name("Perf-perf").description("desc").image("img").type(com.alahadattars.enums.CategoryType.ATTARS).build());
        Product product = productRepository.save(Product.builder().name("P-perf").slug("p-perf").brand("B").category(category).description("D").fragranceFamily("F").topNotes("T").middleNotes("M").baseNotes("B").longevity("L").projection("P").gender(com.alahadattars.enums.Gender.UNISEX).shortDescription("short").build());

        largeCart = new Cart();
        largeCart.setId(1000L);
        largeCart.setItems(new ArrayList<>());

        for (int i = 0; i < 50; i++) {
            ProductVariant variant = productVariantRepository.save(ProductVariant.builder()
                    .product(product).size(i + " ml").price(new BigDecimal("100")).stock(100).active(true).sku("P-perf-" + i).productType(com.alahadattars.enums.ProductType.ATTAR).image("img.jpg").build());

            CartItem item = new CartItem();
            item.setId((long) i);
            item.setCart(largeCart);
            item.setProduct(product);
            item.setVariant(variant);
            item.setQuantity(2);
            item.setPrice(variant.getPrice());
            item.setFreeItem(false);
            largeCart.addItem(item);
        }

        // Setup 100 promotions
        for (int i = 0; i < 100; i++) {
            Promotion p = new Promotion();
            p.setName("Promo " + i);
            p.setPromotionType(i % 2 == 0 ? PromotionType.PRODUCT_DISCOUNT : PromotionType.FREE_PRODUCT);
            p.setActive(true);
            p.setPriority(i);
            PromotionConfiguration config = new PromotionConfiguration();
            if (p.getPromotionType() == PromotionType.PRODUCT_DISCOUNT) {
                p.setDiscountType(com.alahadattars.enums.DiscountType.PERCENTAGE);
                p.setDiscountValue(new BigDecimal("10"));
            } else {
                p.setDiscountType(com.alahadattars.enums.DiscountType.FREE_ITEM);
                config.setFreeCategoryIds(List.of(category.getId()));
                config.setAllowedFreeVariantSize("5 ml");
            }
            p.setConfiguration(config);
            promotionRepository.save(p);
        }
    }

    @Test
    void testEvaluateCartPerformance() {
        // Warmup JVM
        promotionEngineService.evaluateCart(largeCart, null);

        long startTime = System.nanoTime();
        CartResponse response = promotionEngineService.evaluateCart(largeCart, null);
        long endTime = System.nanoTime();

        long durationMs = (endTime - startTime) / 1_000_000;
        
        System.out.println("Cart Evaluation Time with 100 Promos and 50 Items: " + durationMs + " ms");
        
        // Assert it takes less than 500ms (typical threshold for complex business logic)
        assertTrue(durationMs < 500, "Performance degraded: evaluation took " + durationMs + " ms");
    }
}
