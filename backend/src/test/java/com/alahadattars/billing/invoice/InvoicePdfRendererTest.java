package com.alahadattars.billing.invoice;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InvoicePdfRendererTest {
    private final InvoicePdfRenderer renderer = new InvoicePdfRenderer();

    @Test
    void rendersA4CommercialInvoiceWithoutGstTaxInvoiceWording() throws Exception {
        byte[] bytes = renderer.render(invoice(), InvoicePaperFormat.A4);

        try (PDDocument document = Loader.loadPDF(bytes)) {
            assertEquals(1, document.getNumberOfPages());
            String text = new PDFTextStripper().getText(document);
            assertTrue(text.contains("INVOICE POS-0001"));
            assertTrue(text.contains("Rose Attar"));
            assertTrue(text.contains("TOTAL: INR 900.00"));
            assertTrue(text.contains("GST status: UNREGISTERED; tax mode: NO_GST."));
            assertTrue(text.contains("Invoice wording approved for the test."));
            assertFalse(text.contains("GST tax invoice"));
        }
    }

    @Test
    void rendersThermal80MillimeterPdf() throws Exception {
        byte[] bytes = renderer.render(invoice(), InvoicePaperFormat.THERMAL_80);

        try (PDDocument document = Loader.loadPDF(bytes)) {
            assertEquals(1, document.getNumberOfPages());
            assertTrue(new PDFTextStripper().getText(document).contains("Invoice wording approved"));
            assertTrue(document.getPage(0).getMediaBox().getWidth() > 225f);
            assertTrue(document.getPage(0).getMediaBox().getWidth() < 228f);
        }
    }

    @Test
    void refusesToRenderGstEnabledInvoiceUntilTaxCalculationExists() {
        InvoiceSnapshot noGst = invoice();
        InvoiceSnapshot gst = new InvoiceSnapshot(
                noGst.invoiceKey(), noGst.invoiceNumber(), noGst.channel(), noGst.sourceType(), noGst.sourceId(),
                noGst.issuedAt(), noGst.seller(), noGst.customer(), noGst.lines(), noGst.subtotal(),
                noGst.promotionDiscount(), noGst.manualDiscount(), noGst.total(),
                new InvoiceTaxSnapshot(GstStatus.REGISTERED, "29ABCDE1234F1Z5", true, TaxMode.GST),
                noGst.invoiceNoticeSnapshot());

        assertThrows(IllegalStateException.class, () -> renderer.render(gst, InvoicePaperFormat.A4));
    }

    @Test
    void invoiceSnapshotCopiesItsLinesAndRejectsMismatchedTotals() {
        List<InvoiceLineSnapshot> mutableLines = new java.util.ArrayList<>(invoice().lines());
        InvoiceSnapshot snapshot = invoiceWithLines(mutableLines);
        mutableLines.clear();

        assertEquals(1, snapshot.lines().size());
        assertThrows(IllegalArgumentException.class, () -> new InvoiceSnapshot(
                UUID.randomUUID(), "POS-0002", InvoiceChannel.POS, InvoiceSourceType.POS_SALE, 2,
                Instant.now(), new InvoiceSellerSnapshot("Al Ahad Attars", null, null, null), null,
                snapshot.lines(), new BigDecimal("900.00"), BigDecimal.ZERO, BigDecimal.ZERO,
                new BigDecimal("899.99"), InvoiceTaxSnapshot.noGst(), "Invoice wording approved for the test."));
    }

    private static InvoiceSnapshot invoice() {
        return invoiceWithLines(List.of(new InvoiceLineSnapshot(
                1, 9L, 12L, "Rose Attar", "6ml", 1,
                new BigDecimal("900.00"), null, null, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("900.00"))));
    }

    private static InvoiceSnapshot invoiceWithLines(List<InvoiceLineSnapshot> lines) {
        return new InvoiceSnapshot(
                UUID.randomUUID(), "POS-0001", InvoiceChannel.POS, InvoiceSourceType.POS_SALE, 1,
                Instant.parse("2026-11-11T10:00:00Z"),
                new InvoiceSellerSnapshot("Al Ahad Attars", "Test Address", "+910000000000", "billing@example.test"),
                new InvoiceCustomerSnapshot("Walk-in Customer", null, null), lines,
                new BigDecimal("900.00"), BigDecimal.ZERO, BigDecimal.ZERO,
                new BigDecimal("900.00"), InvoiceTaxSnapshot.noGst(), "Invoice wording approved for the test.");
    }
}
