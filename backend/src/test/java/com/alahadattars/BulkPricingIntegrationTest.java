package com.alahadattars;

import com.alahadattars.dto.product.BulkPricingRequest;
import com.alahadattars.entity.BulkPriceAudit;
import com.alahadattars.entity.Role;
import com.alahadattars.entity.User;
import com.alahadattars.enums.BulkPricingOperation;
import com.alahadattars.enums.BulkPricingScope;
import com.alahadattars.enums.BulkPricingType;
import com.alahadattars.repository.BulkPriceAuditRepository;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class BulkPricingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private BulkPriceAuditRepository auditRepository;

    @BeforeEach
    public void setup() {
        if (userRepository.findByEmail("admin_test@alahadattars.com").isEmpty()) {
            Role adminRole = roleRepository.findByName(com.alahadattars.enums.RoleType.ADMIN).orElseGet(() -> {
                Role role = new Role();
                role.setName(com.alahadattars.enums.RoleType.ADMIN);
                return roleRepository.save(role);
            });
            User admin = new User();
            admin.setEmail("admin_test@alahadattars.com");
            admin.setPassword("password");
            admin.setFirstName("Admin");
            admin.setLastName("Test");
            admin.setPhone("+919876543210");
            admin.setRole(adminRole);
            userRepository.save(admin);
        }
    }

    @Test
    @WithMockUser(username = "admin_test@alahadattars.com", roles = {"ADMIN"})
    public void testDoubleSubmissionIdempotency() throws Exception {
        String idempotencyKey = UUID.randomUUID().toString();
        BulkPricingRequest request = BulkPricingRequest.builder()
                .scope(BulkPricingScope.UNIVERSAL)
                .operation(BulkPricingOperation.INCREASE)
                .type(BulkPricingType.PERCENTAGE)
                .value(new BigDecimal("10"))
                .idempotencyKey(idempotencyKey)
                .build();

        String payload = objectMapper.writeValueAsString(request);

        int threads = 3;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        org.springframework.security.core.context.SecurityContext context = org.springframework.security.core.context.SecurityContextHolder.getContext();
        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                org.springframework.security.core.context.SecurityContextHolder.setContext(context);
                try {
                    latch.await();
                    mockMvc.perform(post("/api/admin/products/pricing/apply")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(payload))
                            .andDo(result -> {
                                if (result.getResponse().getStatus() == 200) {
                                    successCount.incrementAndGet();
                                } else {
                                    failCount.incrementAndGet();
                                    System.out.println("FAILED WITH STATUS: " + result.getResponse().getStatus());
                                    System.out.println("FAILED WITH BODY: " + result.getResponse().getContentAsString());
                                }
                            });
                } catch (Exception e) {
                    failCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        latch.countDown(); // Start all threads at exactly the same time
        doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        // Only exactly 1 request should succeed. The others should fail due to uniqueness of idempotencyKey
        assertEquals(1, successCount.get(), "Only one request should succeed");
        assertEquals(2, failCount.get(), "Other requests should fail");
    }

    @Test
    public void testUnauthenticatedAccess() throws Exception {
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
                .andExpect(status().isUnauthorized()); // Or 403 based on config
    }
}
