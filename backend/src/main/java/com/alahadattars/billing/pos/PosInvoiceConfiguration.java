package com.alahadattars.billing.pos;

import com.alahadattars.billing.invoice.InvoiceNumberValue;
import com.alahadattars.billing.invoice.InvoiceSellerSnapshot;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;


/** Required business-approved values for issuing a POS invoice; missing values fail closed. */
@Component
public class PosInvoiceConfiguration {
    private final String sellerName;
    private final String sellerAddress;
    private final String sellerPhone;
    private final String sellerEmail;
    private final String numberFormat;
    private final String unregisteredNotice;
    private final String financialYear;

    public PosInvoiceConfiguration(
            @Value("${billing.invoice.seller.name:}") String sellerName,
            @Value("${billing.invoice.seller.address:}") String sellerAddress,
            @Value("${billing.invoice.seller.phone:}") String sellerPhone,
            @Value("${billing.invoice.seller.email:}") String sellerEmail,
            @Value("${billing.invoice.pos-number-format:}") String numberFormat,
            @Value("${billing.invoice.unregistered-notice:}") String unregisteredNotice,
            @Value("${billing.invoice.financial-year:}") String financialYear) {
        this.sellerName = sellerName;
        this.sellerAddress = sellerAddress;
        this.sellerPhone = sellerPhone;
        this.sellerEmail = sellerEmail;
        this.numberFormat = numberFormat;
        this.unregisteredNotice = unregisteredNotice;
        this.financialYear = financialYear;
    }

    public void validateConfigured() {
        if (sellerName == null || sellerName.isBlank()) {
            throw unavailable("billing.invoice.seller.name must be configured before POS billing is enabled.");
        }
        if (numberFormat == null || numberFormat.isBlank()
                || !numberFormat.contains("{financialYear}") || !numberFormat.contains("{sequence}")) {
            throw unavailable("An approved POS invoice number format with {financialYear} and {sequence} is required.");
        }
        if (unregisteredNotice == null || unregisteredNotice.isBlank()) {
            throw unavailable("Accountant-approved unregistered-invoice wording is not configured.");
        }
        if (financialYear == null || financialYear.isBlank() || financialYear.length() > 20) {
            throw unavailable("The business-approved current financial-year label is not configured.");
        }
    }

    public InvoiceSellerSnapshot sellerSnapshot() {
        validateConfigured();
        return new InvoiceSellerSnapshot(clean(sellerName), clean(sellerAddress), clean(sellerPhone), clean(sellerEmail));
    }

    public String unregisteredNotice() {
        validateConfigured();
        return unregisteredNotice.trim();
    }

    public String financialYear() {
        validateConfigured();
        return financialYear.trim();
    }

    public String format(InvoiceNumberValue value) {
        validateConfigured();
        String formatted = numberFormat.trim()
                .replace("{financialYear}", value.financialYear())
                .replace("{sequence}", Long.toString(value.sequence()));
        if (formatted.length() > 80 || formatted.isBlank()) {
            throw unavailable("Configured POS invoice number format exceeds the supported length.");
        }
        return formatted;
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static ResponseStatusException unavailable(String message) {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, message);
    }
}
