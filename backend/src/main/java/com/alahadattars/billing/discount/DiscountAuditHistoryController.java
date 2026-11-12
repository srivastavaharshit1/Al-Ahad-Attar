package com.alahadattars.billing.discount;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Read-only endpoint retained so a role cleanup cannot hide older audit events. */
@RestController
@PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/billing/discount-audit")
public class DiscountAuditHistoryController {
    private final DiscountAuditHistoryJdbcRepository repository;

    public DiscountAuditHistoryController(DiscountAuditHistoryJdbcRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/{requestId}/events")
    public List<DiscountAuditEventView> events(@PathVariable long requestId) {
        return repository.findEvents(requestId);
    }
}
