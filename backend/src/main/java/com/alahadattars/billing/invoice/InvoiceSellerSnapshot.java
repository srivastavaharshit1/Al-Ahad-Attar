package com.alahadattars.billing.invoice;

public record InvoiceSellerSnapshot(String name, String address, String phone, String email) {
    public InvoiceSellerSnapshot {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("seller name is required");
        }
    }
}
