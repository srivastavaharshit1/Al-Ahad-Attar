package com.alahadattars;

import com.alahadattars.dto.product.BulkPricingRequest;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Role;
import com.alahadattars.entity.User;
import com.alahadattars.enums.BulkPricingOperation;
import com.alahadattars.enums.BulkPricingScope;
import com.alahadattars.enums.BulkPricingType;
import com.alahadattars.enums.ProductType;
import com.alahadattars.enums.RoleType;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.RoleRepository;
import com.alahadattars.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class BulkPricingScenarioTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private CategoryRepository categoryRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private ProductVariantRepository variantRepository;

    private Category attarCategory;
    private Category perfumeCategory;
    private ProductVariant attar10ml;
    private ProductVariant attar20ml;
    private ProductVariant perfume50ml;

    @BeforeEach
    public void setup() {
        if (userRepository.findByEmail("admin_test2@alahadattars.com").isEmpty()) {
            Role adminRole = roleRepository.findByName(RoleType.ADMIN).orElseGet(() -> {
                Role role = new Role();
                role.setName(RoleType.ADMIN);
                return roleRepository.save(role);
            });
            User admin = new User();
            admin.setEmail("admin_test2@alahadattars.com");
            admin.setPassword("password");
            admin.setFirstName("Admin");
            admin.setLastName("Test");
            admin.setPhone("+919876543211");
            admin.setRole(adminRole);
            userRepository.save(admin);
        }

        // Clean up products
        variantRepository.deleteAll();
        productRepository.deleteAll();
        categoryRepository.deleteAll();

        attarCategory = new Category();
        attarCategory.setName("TEST ATTARS");
        attarCategory.setDescription("Test Attars");
        attarCategory.setImage("test.jpg");
        attarCategory.setType(com.alahadattars.enums.CategoryType.ATTARS);
        attarCategory.setActive(true);
        attarCategory = categoryRepository.save(attarCategory);

        perfumeCategory = new Category();
        perfumeCategory.setName("TEST PERFUMES");
        perfumeCategory.setDescription("Test Perfumes");
        perfumeCategory.setImage("test.jpg");
        perfumeCategory.setType(com.alahadattars.enums.CategoryType.PERFUMES);
        perfumeCategory.setActive(true);
        perfumeCategory = categoryRepository.save(perfumeCategory);

        Product p1 = new Product();
        p1.setName("Attar 1");
        p1.setCategory(attarCategory);
        p1.setActive(true);
        p1 = productRepository.save(p1);

        Product p2 = new Product();
        p2.setName("Perfume 1");
        p2.setCategory(perfumeCategory);
        p2.setActive(true);
        p2 = productRepository.save(p2);

        attar10ml = new ProductVariant();
        attar10ml.setProduct(p1);
        attar10ml.setSize("10ml");
        attar10ml.setPrice(new BigDecimal("100"));
        attar10ml.setProductType(ProductType.ATTAR);
        attar10ml.setActive(true);
        attar10ml.setStock(10);
        attar10ml.setSku(UUID.randomUUID().toString());
        attar10ml = variantRepository.save(attar10ml);

        attar20ml = new ProductVariant();
        attar20ml.setProduct(p1);
        attar20ml.setSize("20ml");
        attar20ml.setPrice(new BigDecimal("200"));
        attar20ml.setProductType(ProductType.ATTAR);
        attar20ml.setActive(true);
        attar20ml.setStock(10);
        attar20ml.setSku(UUID.randomUUID().toString());
        attar20ml = variantRepository.save(attar20ml);

        perfume50ml = new ProductVariant();
        perfume50ml.setProduct(p2);
        perfume50ml.setSize("50ml");
        perfume50ml.setPrice(new BigDecimal("500"));
        perfume50ml.setProductType(ProductType.PERFUME);
        perfume50ml.setActive(true);
        perfume50ml.setStock(10);
        perfume50ml.setSku(UUID.randomUUID().toString());
        perfume50ml = variantRepository.save(perfume50ml);
    }

    @Test
    @WithMockUser(username = "admin_test2@alahadattars.com", roles = {"ADMIN"})
    public void testUniversalIncrease() throws Exception {
        BulkPricingRequest request = BulkPricingRequest.builder()
                .scope(BulkPricingScope.UNIVERSAL)
                .operation(BulkPricingOperation.INCREASE)
                .type(BulkPricingType.PERCENTAGE)
                .value(new BigDecimal("10"))
                .idempotencyKey(UUID.randomUUID().toString())
                .build();

        mockMvc.perform(post("/api/admin/products/pricing/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Verify prices
        assertEquals(0, new BigDecimal("110.00").compareTo(variantRepository.findById(attar10ml.getId()).get().getPrice()));
        assertEquals(0, new BigDecimal("220.00").compareTo(variantRepository.findById(attar20ml.getId()).get().getPrice()));
        assertEquals(0, new BigDecimal("550.00").compareTo(variantRepository.findById(perfume50ml.getId()).get().getPrice()));
    }

    @Test
    @WithMockUser(username = "admin_test2@alahadattars.com", roles = {"ADMIN"})
    public void testUniversalDecrease() throws Exception {
        BulkPricingRequest request = BulkPricingRequest.builder()
                .scope(BulkPricingScope.UNIVERSAL)
                .operation(BulkPricingOperation.DECREASE)
                .type(BulkPricingType.PERCENTAGE)
                .value(new BigDecimal("10"))
                .idempotencyKey(UUID.randomUUID().toString())
                .build();

        mockMvc.perform(post("/api/admin/products/pricing/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Verify prices
        assertEquals(0, new BigDecimal("90.00").compareTo(variantRepository.findById(attar10ml.getId()).get().getPrice()));
        assertEquals(0, new BigDecimal("180.00").compareTo(variantRepository.findById(attar20ml.getId()).get().getPrice()));
        assertEquals(0, new BigDecimal("450.00").compareTo(variantRepository.findById(perfume50ml.getId()).get().getPrice()));
    }

    @Test
    @WithMockUser(username = "admin_test2@alahadattars.com", roles = {"ADMIN"})
    public void testCategorySpecific() throws Exception {
        BulkPricingRequest request = BulkPricingRequest.builder()
                .scope(BulkPricingScope.CATEGORY)
                .categoryId(attarCategory.getId())
                .operation(BulkPricingOperation.INCREASE)
                .type(BulkPricingType.PERCENTAGE)
                .value(new BigDecimal("15"))
                .idempotencyKey(UUID.randomUUID().toString())
                .build();

        mockMvc.perform(post("/api/admin/products/pricing/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Verify prices (attars increased by 15%, perfume untouched)
        assertEquals(0, new BigDecimal("115.00").compareTo(variantRepository.findById(attar10ml.getId()).get().getPrice()));
        assertEquals(0, new BigDecimal("230.00").compareTo(variantRepository.findById(attar20ml.getId()).get().getPrice()));
        assertEquals(0, new BigDecimal("500.00").compareTo(variantRepository.findById(perfume50ml.getId()).get().getPrice()));
    }

    @Test
    @WithMockUser(username = "admin_test2@alahadattars.com", roles = {"ADMIN"})
    public void testVariantSizeSpecific() throws Exception {
        BulkPricingRequest request = BulkPricingRequest.builder()
                .scope(BulkPricingScope.UNIVERSAL)
                .size("10ml")
                .operation(BulkPricingOperation.INCREASE)
                .type(BulkPricingType.PERCENTAGE)
                .value(new BigDecimal("5"))
                .idempotencyKey(UUID.randomUUID().toString())
                .build();

        mockMvc.perform(post("/api/admin/products/pricing/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Verify prices (only 10ml increased)
        assertEquals(0, new BigDecimal("105.00").compareTo(variantRepository.findById(attar10ml.getId()).get().getPrice()));
        assertEquals(0, new BigDecimal("200.00").compareTo(variantRepository.findById(attar20ml.getId()).get().getPrice()));
        assertEquals(0, new BigDecimal("500.00").compareTo(variantRepository.findById(perfume50ml.getId()).get().getPrice()));
    }

    @Test
    @WithMockUser(username = "admin_test2@alahadattars.com", roles = {"ADMIN"})
    public void testInvalidInput() throws Exception {
        // -10% should fail
        BulkPricingRequest req1 = BulkPricingRequest.builder()
                .scope(BulkPricingScope.UNIVERSAL)
                .operation(BulkPricingOperation.INCREASE)
                .type(BulkPricingType.PERCENTAGE)
                .value(new BigDecimal("-10"))
                .idempotencyKey(UUID.randomUUID().toString())
                .build();
        mockMvc.perform(post("/api/admin/products/pricing/apply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isBadRequest());

        // 101% should fail
        BulkPricingRequest req2 = BulkPricingRequest.builder()
                .scope(BulkPricingScope.UNIVERSAL)
                .operation(BulkPricingOperation.INCREASE)
                .type(BulkPricingType.PERCENTAGE)
                .value(new BigDecimal("101"))
                .idempotencyKey(UUID.randomUUID().toString())
                .build();
        mockMvc.perform(post("/api/admin/products/pricing/apply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isBadRequest());
    }
}
