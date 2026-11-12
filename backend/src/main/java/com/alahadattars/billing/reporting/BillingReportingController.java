package com.alahadattars.billing.reporting;

import com.alahadattars.billing.invoice.InvoiceChannel;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/billing")
public class BillingReportingController {
    private final BillingReportingService reporting;

    public BillingReportingController(BillingReportingService reporting) { this.reporting = reporting; }

    @GetMapping("/invoices/history")
    public BillingPage<InvoiceHistoryRecord> invoices(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) InvoiceChannel channel,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return reporting.invoices(search, channel, paymentMethod, from, to, limit, offset);
    }

    @GetMapping("/pos/sales")
    public BillingPage<PosSaleHistoryRecord> sales(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String tenderMethod,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return reporting.posSales(search, tenderMethod, from, to, limit, offset);
    }

    @GetMapping("/reports/summary")
    public BillingSalesSummary summary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reporting.summary(from, to);
    }
}
