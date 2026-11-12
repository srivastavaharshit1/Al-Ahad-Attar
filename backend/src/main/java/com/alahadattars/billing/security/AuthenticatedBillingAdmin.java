package com.alahadattars.billing.security;

import com.alahadattars.security.CustomUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

/** A server-derived ADMIN identity for billing audit fields. */
public record AuthenticatedBillingAdmin(long userId, String email) {
    public static AuthenticatedBillingAdmin from(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()))) {
            throw new AccessDeniedException("ADMIN access is required for billing");
        }
        if (!(authentication.getPrincipal() instanceof CustomUserDetails details)
                || details.getUser().getId() == null) {
            throw new AccessDeniedException("The authenticated ADMIN identity could not be resolved");
        }
        return new AuthenticatedBillingAdmin(details.getUser().getId(), details.getUsername());
    }
}
