package com.alahadattars.billing.reporting;

import com.alahadattars.billing.invoice.InvoiceChannel;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Service
public class BillingReportingService {
    private final BillingReportingRepository repository;

    public BillingReportingService(BillingReportingRepository repository) { this.repository = repository; }

    public BillingPage<InvoiceHistoryRecord> invoices(String search, InvoiceChannel channel, String paymentMethod,
                                                       LocalDate from, LocalDate to, int limit, int offset) {
        validatePage(limit, offset);
        validateRange(from, to, 3660);
        if (search != null && search.length() > 200) throw badRequest("Search text is too long.");
        if (paymentMethod != null && !paymentMethod.isBlank()
                && !java.util.Set.of("ONLINE", "CASH", "UPI", "CARD").contains(paymentMethod.toUpperCase())) {
            throw badRequest("Unsupported payment method filter.");
        }
        return repository.invoiceHistory(search, channel, paymentMethod, from, to, limit, offset);
    }

    public BillingPage<PosSaleHistoryRecord> posSales(String search, String tenderMethod, LocalDate from,
                                                       LocalDate to, int limit, int offset) {
        validatePage(limit, offset);
        validateRange(from, to, 3660);
        if (search != null && search.length() > 200) throw badRequest("Search text is too long.");
        if (tenderMethod != null && !tenderMethod.isBlank()
                && !java.util.Set.of("CASH", "UPI", "CARD").contains(tenderMethod.toUpperCase())) {
            throw badRequest("Unsupported tender method filter.");
        }
        return repository.posSales(search, tenderMethod, from, to, limit, offset);
    }

    public BillingSalesSummary summary(LocalDate from, LocalDate to) {
        if (from == null || to == null) throw badRequest("Both from and to dates are required for reports.");
        validateRange(from, to, 366);
        return repository.summary(from, to);
    }

    private static void validatePage(int limit, int offset) {
        if (limit < 1 || limit > 200 || offset < 0) throw badRequest("Invalid billing history page.");
    }
    private static void validateRange(LocalDate from, LocalDate to, long maxDays) {
        if (from != null && to != null && (from.isAfter(to) || ChronoUnit.DAYS.between(from, to) > maxDays)) {
            throw badRequest("Date range is invalid or too wide.");
        }
    }
    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
