package com.alahadattars.billing.invoice;

public record InvoiceTaxSnapshot(GstStatus status, String gstin, boolean gstEnabled, TaxMode mode) {
    public InvoiceTaxSnapshot {
        if (status == null || mode == null) {
            throw new IllegalArgumentException("tax status and mode are required");
        }
        if (status == GstStatus.UNREGISTERED && (gstin != null || gstEnabled || mode != TaxMode.NO_GST)) {
            throw new IllegalArgumentException("unregistered invoices must use NULL GSTIN, disabled GST and NO_GST mode");
        }
        if (gstEnabled && (status != GstStatus.REGISTERED || gstin == null || gstin.isBlank() || mode != TaxMode.GST)) {
            throw new IllegalArgumentException("GST requires registered status, configured GSTIN and GST mode");
        }
    }

    public static InvoiceTaxSnapshot noGst() {
        return new InvoiceTaxSnapshot(GstStatus.UNREGISTERED, null, false, TaxMode.NO_GST);
    }
}
