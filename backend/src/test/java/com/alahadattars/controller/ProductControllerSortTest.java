package com.alahadattars.controller;

import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class ProductControllerSortTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    public void testSortByPriceAscAndDesc() throws Exception {
        Category cat = new Category();
        cat.setName("TestCategoryX");
        cat.setDescription("TestCategoryX");
        cat.setImage("test.jpg");
        cat.setType(com.alahadattars.enums.CategoryType.PERFUMES);
        categoryRepository.save(cat);

        // Product A: 249, 399
        Product pA = Product.builder().name("Product A").slug("product-a").description("desc").category(cat).brand("Al Ahad").gender(com.alahadattars.enums.Gender.UNISEX).fragranceFamily("").topNotes("").middleNotes("").baseNotes("").longevity("").projection("").build();
        ProductVariant vA1 = ProductVariant.builder().product(pA).sku("A1").size("10ml").price(new BigDecimal("299")).discountedPrice(new BigDecimal("249")).stock(10).productType(com.alahadattars.enums.ProductType.ATTAR).build();
        ProductVariant vA2 = ProductVariant.builder().product(pA).sku("A2").size("20ml").price(new BigDecimal("399")).discountedPrice(new BigDecimal("399")).stock(10).productType(com.alahadattars.enums.ProductType.ATTAR).build();
        pA.getVariants().add(vA1);
        pA.getVariants().add(vA2);
        productRepository.save(pA);

        // Product B: 199, 499
        Product pB = Product.builder().name("Product B").slug("product-b").description("desc").category(cat).brand("Al Ahad").gender(com.alahadattars.enums.Gender.UNISEX).fragranceFamily("").topNotes("").middleNotes("").baseNotes("").longevity("").projection("").build();
        ProductVariant vB1 = ProductVariant.builder().product(pB).sku("B1").size("10ml").price(new BigDecimal("199")).discountedPrice(new BigDecimal("199")).stock(10).productType(com.alahadattars.enums.ProductType.ATTAR).build();
        ProductVariant vB2 = ProductVariant.builder().product(pB).sku("B2").size("20ml").price(new BigDecimal("499")).discountedPrice(new BigDecimal("499")).stock(10).productType(com.alahadattars.enums.ProductType.ATTAR).build();
        pB.getVariants().add(vB1);
        pB.getVariants().add(vB2);
        productRepository.save(pB);

        // Product C: Inactive variant only
        Product pC = Product.builder().name("Product C").slug("product-c").description("desc").category(cat).brand("Al Ahad").gender(com.alahadattars.enums.Gender.UNISEX).fragranceFamily("").topNotes("").middleNotes("").baseNotes("").longevity("").projection("").build();
        ProductVariant vC1 = ProductVariant.builder().product(pC).sku("C1").size("10ml").price(new BigDecimal("100")).discountedPrice(new BigDecimal("100")).stock(10).active(false).productType(com.alahadattars.enums.ProductType.ATTAR).build();
        pC.getVariants().add(vC1);
        productRepository.save(pC);

        // Ascending sort (Expected: Product C (0), Product B (199), Product A (249))
        mockMvc.perform(get("/api/products?categoryId=" + cat.getId() + "&sort=price,asc"))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].name", is("Product C")))
                .andExpect(jsonPath("$.data.content[1].name", is("Product B")))
                .andExpect(jsonPath("$.data.content[2].name", is("Product A")));

        // Descending sort (Expected: Product A (249), Product B (199), Product C (0))
        mockMvc.perform(get("/api/products?categoryId=" + cat.getId() + "&sort=price,desc"))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].name", is("Product A")))
                .andExpect(jsonPath("$.data.content[1].name", is("Product B")))
                .andExpect(jsonPath("$.data.content[2].name", is("Product C")));
    }
}
