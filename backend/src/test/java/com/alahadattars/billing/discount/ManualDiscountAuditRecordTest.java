package com.alahadattars.billing.discount;

import com.alahadattars.entity.Role;
import com.alahadattars.entity.User;
import com.alahadattars.enums.RoleType;
import com.alahadattars.security.CustomUserDetails;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ManualDiscountAuditRecordTest {
    @Test
    void auditActorComesFromAuthenticatedAdminPrincipal() {
        ManualDiscountAuditRecord audit = ManualDiscountAuditRecord.fromAuthenticatedAdmin(
                authentication(73L, RoleType.ADMIN), 501L, 2L,
                new ManualDiscountApplication(DiscountScope.ITEM, DiscountType.FIXED,
                        new BigDecimal("12.00"), new BigDecimal("12.00"), new BigDecimal("100.00"),
                        "line-2", "Customer loyalty"),
                Instant.parse("2026-11-11T10:00:00Z"));

        assertEquals(73L, audit.adminUserId());
        assertEquals(501L, audit.saleId());
        assertEquals(2L, audit.saleLineId());
        assertEquals("Customer loyalty", audit.reason());
    }

    @Test
    void ordinaryUserCannotCreateAdminDiscountAudit() {
        assertThrows(AccessDeniedException.class, () -> ManualDiscountAuditRecord.fromAuthenticatedAdmin(
                authentication(81L, RoleType.USER), 501L, null,
                new ManualDiscountApplication(DiscountScope.SALE, DiscountType.PERCENT,
                        new BigDecimal("10"), new BigDecimal("10"), new BigDecimal("100"),
                        null, "Reason"), Instant.now()));
    }

    private static UsernamePasswordAuthenticationToken authentication(long id, RoleType roleType) {
        User user = new User();
        user.setId(id);
        user.setEmail("billing-admin@example.test");
        Role role = new Role();
        role.setName(roleType);
        user.setRole(role);
        CustomUserDetails details = new CustomUserDetails(user);
        return new UsernamePasswordAuthenticationToken(details, null, List.copyOf(details.getAuthorities()));
    }
}
