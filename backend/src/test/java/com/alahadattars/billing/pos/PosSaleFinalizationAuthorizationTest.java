package com.alahadattars.billing.pos;

import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import com.alahadattars.entity.Role;
import com.alahadattars.entity.User;
import com.alahadattars.enums.RoleType;
import com.alahadattars.security.CustomUserDetails;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@Import({PosSaleFinalizationController.class, PosSaleFinalizationAuthorizationTest.MethodSecurityConfiguration.class})
class PosSaleFinalizationAuthorizationTest {
    @Autowired private MockMvc mockMvc;
    @MockBean private PosSaleFinalizationService finalizationService;

    private static final String BODY = """
            {
              "quote": {
                "lines": [{"lineKey":"line-a","productId":1,"variantId":2,"quantity":1}],
                "manualDiscounts": [],
                "freeRewards": [],
                "customerName": null,
                "customerMobile": null,
                "customerEmail": null
              },
              "tender": {"method":"CASH","amountReceived":"100.00"},
              "confirmedQuoteFingerprint": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
            }
            """;

    @Test
    void adminCanReachFinalizationEndpoint() throws Exception {
        PosSaleFinalizeResponse response = new PosSaleFinalizeResponse(1, java.util.UUID.randomUUID(), "COMPLETED",
                2, "POS-TEST-1", java.time.Instant.now(), "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                new java.math.BigDecimal("100.00"), java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO,
                new java.math.BigDecimal("100.00"), com.alahadattars.billing.sale.TenderMethod.CASH,
                new java.math.BigDecimal("100.00"), java.math.BigDecimal.ZERO, new java.math.BigDecimal("100.00"), false);
        when(finalizationService.finalizeSale(eq("authorization-test-key-01"), any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/billing/pos/sales/finalize")
                        .with(adminAuthentication(RoleType.ADMIN)).with(csrf())
                        .header("Idempotency-Key", "authorization-test-key-01")
                        .contentType("application/json").content(BODY))
                .andExpect(status().isOk());

        verify(finalizationService).finalizeSale(eq("authorization-test-key-01"), any(), any());
    }

    @Test
    void ordinaryUserIsDeniedBeforeFinalizationServiceRuns() throws Exception {
        mockMvc.perform(post("/api/billing/pos/sales/finalize")
                        .with(adminAuthentication(RoleType.USER)).with(csrf())
                        .header("Idempotency-Key", "authorization-test-key-02")
                        .contentType("application/json").content(BODY))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousUserIsDeniedBeforeFinalizationServiceRuns() throws Exception {
        mockMvc.perform(post("/api/billing/pos/sales/finalize")
                        .with(csrf())
                        .header("Idempotency-Key", "authorization-test-key-03")
                        .contentType("application/json").content(BODY))
                .andExpect(status().isUnauthorized());
    }

    private static RequestPostProcessor adminAuthentication(RoleType roleType) {
        User user = new User();
        user.setId(roleType == RoleType.ADMIN ? 101L : 102L);
        user.setEmail(roleType.name().toLowerCase(java.util.Locale.ROOT) + "@example.test");
        Role role = new Role();
        role.setName(roleType);
        user.setRole(role);
        CustomUserDetails principal = new CustomUserDetails(user);
        return authentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class MethodSecurityConfiguration { }
}
