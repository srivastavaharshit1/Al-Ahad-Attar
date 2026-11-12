package com.alahadattars.billing.invoice;

public record InvoicePdfDocument(long invoiceId, InvoicePaperFormat format, String sha256, byte[] content) {
    public InvoicePdfDocument {
        if (invoiceId <= 0 || format == null || sha256 == null || content == null) {
            throw new IllegalArgumentException("invoice PDF document values are required");
        }
        content = content.clone();
    }

    @Override
    public byte[] content() {
        return content.clone();
    }
}
