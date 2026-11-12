package com.alahadattars.billing.invoice;

import com.alahadattars.billing.delivery.InvoiceDeliveryService;
import com.alahadattars.billing.delivery.InvoiceDeliveryChannel;
import com.alahadattars.billing.delivery.InvoiceDeliveryStatus;
import com.alahadattars.billing.delivery.InvoiceDeliveryView;
import com.alahadattars.billing.discount.DiscountAuditHistoryController;
import com.alahadattars.billing.discount.DiscountAuditHistoryJdbcRepository;
import com.alahadattars.billing.online.OnlineInvoiceJobController;
import com.alahadattars.billing.online.OnlineInvoiceJobJdbcRepository;
import com.alahadattars.billing.reporting.BillingReportingController;
import com.alahadattars.billing.reporting.BillingReportingService;
import com.alahadattars.config.SecurityConfig;
import com.alahadattars.entity.Role;
import com.alahadattars.entity.User;
import com.alahadattars.enums.RoleType;
import com.alahadattars.security.CustomUserDetails;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.config.Customizer.withDefaults;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {BillingInvoiceController.class, DiscountAuditHistoryController.class,
        BillingReportingController.class, OnlineInvoiceJobController.class},
        excludeFilters = @org.springframework.context.annotation.ComponentScan.Filter(
                type = org.springframework.context.annotation.FilterType.ASSIGNABLE_TYPE,
                classes = SecurityConfig.class))
@Import({BillingInvoiceController.class, DiscountAuditHistoryController.class,
        BillingReportingController.class, OnlineInvoiceJobController.class,
        BillingInvoiceAuthorizationTest.TestSecurityConfiguration.class})
class BillingInvoiceAuthorizationTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InvoiceDeliveryService deliveryService;

    @MockBean
    private DiscountAuditHistoryJdbcRepository discountAuditRepository;

    @MockBean
    private BillingReportingService reportingService;

    @MockBean
    private OnlineInvoiceJobJdbcRepository onlineInvoiceJobs;

    @Test
    void adminCanCallInvoiceHistoryApi() throws Exception {
        when(deliveryService.findHistory(null, 50, 0)).thenReturn(List.of());
        when(deliveryService.consentPolicies()).thenReturn(List.of());
        when(deliveryService.findPdf(1, InvoicePaperFormat.A4)).thenReturn(Optional.empty());
        when(deliveryService.findDeliveryHistory(1)).thenReturn(List.of());
        when(deliveryService.findConsents(1)).thenReturn(List.of());
        when(deliveryService.enqueue(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(InvoiceDeliveryChannel.EMAIL), org.mockito.ArgumentMatchers.eq("delivery-1")))
                .thenReturn(new InvoiceDeliveryView(1, UUID.randomUUID(), InvoiceDeliveryChannel.EMAIL,
                        InvoiceDeliveryStatus.PENDING, 0, "admin@example.test", null, null, null, null, null));
        when(discountAuditRepository.findEvents(1)).thenReturn(List.of());
        when(reportingService.invoices(null, null, null, null, null, 25, 0))
                .thenReturn(new com.alahadattars.billing.reporting.BillingPage<>(List.of(), 0, 25, 0));
        when(reportingService.posSales(null, null, null, null, 25, 0))
                .thenReturn(new com.alahadattars.billing.reporting.BillingPage<>(List.of(), 0, 25, 0));
        when(onlineInvoiceJobs.findPage(null, 50, 0))
                .thenReturn(new com.alahadattars.billing.reporting.BillingPage<>(List.of(), 0, 50, 0));
        when(onlineInvoiceJobs.requestRetry(1, 42, "retry-idempotency-0001")).thenReturn(true);

        mockMvc.perform(get("/api/billing/invoices").with(authenticate(RoleType.ADMIN)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/billing/invoices/consent-policy").with(authenticate(RoleType.ADMIN)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/billing/invoices/1/pdf").with(authenticate(RoleType.ADMIN)))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/billing/invoices/1/consent").with(authenticate(RoleType.ADMIN))
                        .contentType(APPLICATION_JSON)
                        .content("{\"channel\":\"EMAIL\",\"destination\":\"admin@example.test\",\"status\":\"GRANTED\",\"wordingVersion\":\"v1\"}"))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/billing/invoices/1/delivery/EMAIL").with(authenticate(RoleType.ADMIN))
                        .header("Idempotency-Key", "delivery-1"))
                .andExpect(status().isAccepted());
        mockMvc.perform(get("/api/billing/invoices/1/delivery").with(authenticate(RoleType.ADMIN)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/billing/invoices/1/consent").with(authenticate(RoleType.ADMIN)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/billing/discount-audit/1/events").with(authenticate(RoleType.ADMIN)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/billing/invoices/history").with(authenticate(RoleType.ADMIN)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/billing/pos/sales").with(authenticate(RoleType.ADMIN)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/billing/reports/summary?from=2026-11-01&to=2026-11-12")
                        .with(authenticate(RoleType.ADMIN)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/billing/online-invoice-jobs").with(authenticate(RoleType.ADMIN)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/billing/online-invoice-jobs/1/retry").with(authenticate(RoleType.ADMIN))
                        .header("Idempotency-Key", "retry-idempotency-0001"))
                .andExpect(status().isAccepted());
    }

    @Test
    void authenticatedUserIsDeniedAtDirectBillingApi() throws Exception {
        RequestPostProcessor user = authenticate(RoleType.USER);
        mockMvc.perform(get("/api/billing/invoices").with(user))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/billing/invoices/consent-policy").with(user))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/billing/invoices/1/pdf").with(user))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/billing/invoices/1/consent").with(user)
                        .contentType(APPLICATION_JSON)
                        .content("{\"channel\":\"EMAIL\",\"destination\":\"user@example.test\",\"status\":\"GRANTED\",\"wordingVersion\":\"v1\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/billing/invoices/1/delivery/EMAIL").with(user)
                        .header("Idempotency-Key", "delivery-1"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/billing/invoices/1/delivery").with(user))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/billing/invoices/1/consent").with(user))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/billing/discount-audit/1/events").with(user))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/billing/invoices/history").with(user))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/billing/pos/sales").with(user))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/billing/reports/summary?from=2026-11-01&to=2026-11-12").with(user))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/billing/online-invoice-jobs").with(user))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/billing/online-invoice-jobs/1/retry").with(user)
                        .header("Idempotency-Key", "retry-idempotency-0001"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(deliveryService, discountAuditRepository, reportingService, onlineInvoiceJobs);
    }

    @Test
    void anonymousCallerIsDeniedAtDirectBillingApi() throws Exception {
        mockMvc.perform(get("/api/billing/invoices"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/billing/discount-audit/1/events"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/billing/invoices/history"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/billing/pos/sales"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/billing/reports/summary?from=2026-11-01&to=2026-11-12"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/billing/online-invoice-jobs"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(deliveryService, discountAuditRepository, reportingService, onlineInvoiceJobs);
    }

    private static RequestPostProcessor authenticate(RoleType roleType) {
        User user = new User();
        user.setId(42L);
        user.setEmail(roleType.name().toLowerCase() + "@example.test");
        Role role = new Role();
        role.setName(roleType);
        user.setRole(role);
        CustomUserDetails principal = new CustomUserDetails(user);
        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities());
        return authentication(authToken);
    }

    @Configuration
    @EnableWebSecurity
    @EnableMethodSecurity
    static class TestSecurityConfiguration {
        @Bean
        SecurityFilterChain billingTestSecurityFilterChain(HttpSecurity http) throws Exception {
            http.csrf(csrf -> csrf.disable())
                    .authorizeHttpRequests(requests -> requests.anyRequest().authenticated())
                    .httpBasic(withDefaults());
            return http.build();
        }
    }
}
