package com.alahadattars.billing.invoice;

public record InvoiceNumberValue(InvoiceChannel channel, String financialYear, long sequence) {
    public InvoiceNumberValue {
        if (channel == null || financialYear == null || financialYear.isBlank() || sequence <= 0) {
            throw new IllegalArgumentException("invoice sequence allocation values are invalid");
        }
    }
}
