package com.alahadattars.billing.online;

import com.alahadattars.billing.invoice.InvoiceNumberValue;
import com.alahadattars.billing.invoice.InvoiceSellerSnapshot;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Online invoice settings use the same approved seller and NO_GST wording, with a separate number format. */
@Component
public class OnlineInvoiceConfiguration {
    private final String sellerName;
    private final String sellerAddress;
    private final String sellerPhone;
    private final String sellerEmail;
    private final String numberFormat;
    private final String unregisteredNotice;
    private final String financialYear;

    public OnlineInvoiceConfiguration(
            @Value("${billing.invoice.seller.name:}") String sellerName,
            @Value("${billing.invoice.seller.address:}") String sellerAddress,
            @Value("${billing.invoice.seller.phone:}") String sellerPhone,
            @Value("${billing.invoice.seller.email:}") String sellerEmail,
            @Value("${billing.invoice.online-number-format:}") String numberFormat,
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

    public void validate() {
        if (blank(sellerName)) throw unavailable("Approved invoice seller name is not configured.");
        if (blank(numberFormat) || !numberFormat.contains("{financialYear}") || !numberFormat.contains("{sequence}")) {
            throw unavailable("An approved online invoice number format with {financialYear} and {sequence} is required.");
        }
        if (blank(unregisteredNotice)) throw unavailable("Accountant-approved unregistered invoice wording is not configured.");
        if (blank(financialYear) || financialYear.length() > 20) throw unavailable("Approved financial-year label is not configured.");
    }

    public InvoiceSellerSnapshot seller() {
        validate();
        return new InvoiceSellerSnapshot(clean(sellerName), clean(sellerAddress), clean(sellerPhone), clean(sellerEmail));
    }

    public String financialYear() {
        validate();
        return financialYear.trim();
    }

    public String notice() {
        validate();
        return unregisteredNotice.trim();
    }

    public String format(InvoiceNumberValue value) {
        validate();
        String formatted = numberFormat.trim().replace("{financialYear}", value.financialYear())
                .replace("{sequence}", Long.toString(value.sequence()));
        if (formatted.isBlank() || formatted.length() > 80) {
            throw unavailable("Configured online invoice number format exceeds the supported length.");
        }
        return formatted;
    }

    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static String clean(String value) { return blank(value) ? null : value.trim(); }
    private static OnlineInvoiceConfigurationUnavailableException unavailable(String message) {
        return new OnlineInvoiceConfigurationUnavailableException(message);
    }
}
