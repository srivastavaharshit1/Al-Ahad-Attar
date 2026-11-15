package com.alahadattars.billing.invoice;

import com.alahadattars.billing.sale.PosTenderSnapshot;
import com.alahadattars.billing.sale.TenderMethod;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
public class InvoicePdfRenderer {
    private static final float THERMAL_WIDTH = 80f * 72f / 25.4f;
    private static final int A4_LINES_PER_PAGE = 46;
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")
            .withZone(ZoneId.of("Asia/Kolkata"));

    @Value("${billing.invoice.font-path:}")
    private String fontPath;

    public byte[] render(InvoiceSnapshot invoice, InvoicePaperFormat format) {
        if (invoice.tax().gstEnabled()) {
            throw new IllegalStateException("GST PDF rendering is unavailable until accountant-approved tax calculation is implemented");
        }
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDFont font = loadFont(document);
            PDFont boldFont = fontPath == null || fontPath.isBlank()
                    ? new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD) : font;
            List<String> lines = buildLines(invoice, format);
            if (format == InvoicePaperFormat.A4) {
                for (int offset = 0; offset < lines.size(); offset += A4_LINES_PER_PAGE) {
                    int end = Math.min(offset + A4_LINES_PER_PAGE, lines.size());
                    drawPage(document, PDRectangle.A4, lines.subList(offset, end), font, boldFont, 40f, 9.5f, 13.5f, offset == 0);
                }
            } else {
                float height = Math.max(260f, 28f + lines.size() * 11f);
                drawPage(document, new PDRectangle(THERMAL_WIDTH, height), lines, font, boldFont, 10f, 8f, 11f, true);
            }
            document.getDocumentInformation().setTitle("Invoice " + invoice.invoiceNumber());
            document.save(output);
            return output.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Could not generate invoice PDF", e);
        }
    }

    private PDFont loadFont(PDDocument document) throws IOException {
        if (fontPath == null || fontPath.isBlank()) {
            return new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        }
        Path path = Path.of(fontPath);
        try (InputStream input = Files.newInputStream(path)) {
            return PDType0Font.load(document, input, true);
        }
    }

    private static List<String> buildLines(InvoiceSnapshot invoice, InvoicePaperFormat format) {
        return format == InvoicePaperFormat.A4 ? buildA4Lines(invoice) : buildThermalLines(invoice);
    }

    private static List<String> buildA4Lines(InvoiceSnapshot invoice) {
        int width = 94;
        List<String> lines = new ArrayList<>();

        // 1. HEADER
        lines.add(center("AL AHAD ATTARS", width));
        lines.add(center("Luxury Attars & Pure Fragrances", width));
        String sellerInfo = joinNonBlank("", invoice.seller().address())
                + (blank(invoice.seller().phone()) ? "" : " | Phone: " + invoice.seller().phone())
                + (blank(invoice.seller().email()) ? "" : " | Email: " + invoice.seller().email());
        if (!blank(sellerInfo)) {
            addWrapped(lines, center(sellerInfo, width), width);
        }
        lines.add(center("Online: https://alahadattars.com", width));
        lines.add(repeatChar('=', width));

        // 2. INVOICE META & CUSTOMER DETAILS
        String dateStr = formatDateTime(invoice.issuedAt());
        lines.add(padBetween("INVOICE NUMBER: " + invoice.invoiceNumber(), "DATE: " + dateStr, width));
        lines.add(repeatChar('-', width));

        String customerName = invoice.customer() == null || blank(invoice.customer().name()) ? "Walk-in Customer" : invoice.customer().name();
        String customerMobile = invoice.customer() == null || blank(invoice.customer().mobile()) ? "—" : invoice.customer().mobile();
        lines.add(padBetween("Customer Name: " + customerName, "Mobile: " + customerMobile, width));
        if (invoice.customer() != null && !blank(invoice.customer().email())) {
            lines.add("Email: " + invoice.customer().email());
        }
        lines.add(repeatChar('-', width));

        // 3. TABLE HEADER
        // Format: #  Item Description (44)  Qty (5)  Unit Price (12)  Pack/Charge (14)  Total (12)
        lines.add(String.format("%-3s %-44s %5s %12s %14s %12s", "#", "Item Description", "Qty", "Price", "Packaging", "Total"));
        lines.add(repeatChar('-', width));

        // 4. ITEMS
        int idx = 1;
        for (InvoiceLineSnapshot item : invoice.lines()) {
            String itemTitle = item.productName() + (blank(item.variantSize()) ? "" : " (" + item.variantSize() + ")");
            if (itemTitle.length() > 44) itemTitle = itemTitle.substring(0, 41) + "...";

            String packagingAmt = item.bottlePrice() != null && item.bottlePrice().signum() > 0
                    ? "+" + money(item.bottlePrice()) : "—";
            String lineTotalStr = money(item.lineTotal());

            lines.add(String.format("%-3d %-44s %5d %12s %14s %12s",
                    idx++, itemTitle, item.quantity(), money(item.unitPrice()), packagingAmt, lineTotalStr));

            // Packaging detail line (bottle name / gift box)
            if (!blank(item.bottleName())) {
                lines.add("    Packaging: " + item.bottleName());
            }

            // Discount or free item notices
            if (item.freeItem()) {
                lines.add("    * FREE PROMOTIONAL REWARD");
            } else if (item.manualDiscount() != null && item.manualDiscount().signum() > 0) {
                lines.add("    * Item Discount Applied: -INR " + money(item.manualDiscount()));
            }
        }
        lines.add(repeatChar('-', width));

        // 5. PAYMENT & TOTALS SUMMARY
        BigDecimal totalDiscounts = invoice.promotionDiscount().add(invoice.manualDiscount());
        lines.add(padBetween("Items Subtotal:", "INR " + money(invoice.subtotal()), width));
        if (totalDiscounts.signum() > 0) {
            lines.add(padBetween("Total Discounts Applied:", "-INR " + money(totalDiscounts), width));
        }
        lines.add(repeatChar('-', width));
        lines.add(padBetween("NET PAYABLE AMOUNT:", "INR " + money(invoice.total()), width));
        lines.add(repeatChar('-', width));

        // Tender settlement details
        PosTenderSnapshot tender = invoice.tender();
        if (tender != null) {
            lines.add(padBetween("Payment Method:", tender.method().name(), width));
            if (tender.method() == TenderMethod.CASH) {
                lines.add(padBetween("Amount Received:", "INR " + money(tender.amountReceived()), width));
                lines.add(padBetween("Change Returned:", "INR " + money(tender.changeReturned()), width));
            } else if (!blank(tender.transactionReference())) {
                lines.add(padBetween("Transaction Ref:", tender.transactionReference(), width));
            }
        } else {
            lines.add(padBetween("Payment Status:", "PAID & SETTLED", width));
        }
        lines.add(repeatChar('=', width));

        // 6. BRAND FOOTER (No GST, pure customer appreciation)
        lines.add(center("Thank you for shopping at Al Ahad Attars!", width));
        lines.add(center("We look forward to serving you again · Have a blessed day!", width));
        lines.add(center("Visit: https://alahadattars.com", width));
        lines.add(repeatChar('=', width));

        return lines;
    }

    private static List<String> buildThermalLines(InvoiceSnapshot invoice) {
        int width = 32;
        List<String> lines = new ArrayList<>();

        // 1. HEADER
        lines.add(center("AL AHAD ATTARS", width));
        lines.add(center("Pure Luxury Fragrances", width));
        if (!blank(invoice.seller().phone())) {
            lines.add(center("Ph: " + invoice.seller().phone(), width));
        }
        lines.add(repeatChar('=', width));

        // 2. INVOICE META & CUSTOMER
        lines.add("INV: " + invoice.invoiceNumber());
        lines.add("Date: " + formatDateTime(invoice.issuedAt()));
        String customerName = invoice.customer() == null || blank(invoice.customer().name()) ? "Walk-in" : invoice.customer().name();
        lines.add("Customer: " + customerName);
        if (invoice.customer() != null && !blank(invoice.customer().mobile())) {
            lines.add("Mobile: " + invoice.customer().mobile());
        }
        lines.add(repeatChar('-', width));

        // 3. ITEMS
        int idx = 1;
        for (InvoiceLineSnapshot item : invoice.lines()) {
            lines.add(idx++ + ". " + item.productName() + (blank(item.variantSize()) ? "" : " / " + item.variantSize()));
            lines.add(padBetween("   Qty: " + item.quantity() + " @ INR " + money(item.unitPrice()), "INR " + money(item.lineTotal()), width));

            if (!blank(item.bottleName())) {
                addWrapped(lines, "   Pack: " + item.bottleName(), width);
            }
            if (item.freeItem()) {
                lines.add("   * FREE PROMOTIONAL ITEM");
            } else if (item.manualDiscount() != null && item.manualDiscount().signum() > 0) {
                lines.add("   * Discount: -INR " + money(item.manualDiscount()));
            }
        }
        lines.add(repeatChar('-', width));

        // 4. TOTALS
        lines.add(padBetween("Subtotal:", "INR " + money(invoice.subtotal()), width));
        BigDecimal totalDiscounts = invoice.promotionDiscount().add(invoice.manualDiscount());
        if (totalDiscounts.signum() > 0) {
            lines.add(padBetween("Discount:", "-INR " + money(totalDiscounts), width));
        }
        lines.add(repeatChar('-', width));
        lines.add(padBetween("NET PAYABLE:", "INR " + money(invoice.total()), width));
        lines.add(repeatChar('-', width));

        // Tender settlement
        PosTenderSnapshot tender = invoice.tender();
        if (tender != null) {
            lines.add(padBetween("Method:", tender.method().name(), width));
            if (tender.method() == TenderMethod.CASH) {
                lines.add(padBetween("Received:", "INR " + money(tender.amountReceived()), width));
                lines.add(padBetween("Change:", "INR " + money(tender.changeReturned()), width));
            } else if (!blank(tender.transactionReference())) {
                lines.add(padBetween("Ref:", tender.transactionReference(), width));
            }
        } else {
            lines.add(padBetween("Status:", "PAID & SETTLED", width));
        }
        lines.add(repeatChar('=', width));

        // 5. FOOTER
        lines.add(center("Thank you for your visit!", width));
        lines.add(center("Have a blessed day!", width));
        lines.add(repeatChar('=', width));

        return lines;
    }

    private static void drawPage(
            PDDocument document,
            PDRectangle size,
            List<String> lines,
            PDFont font,
            PDFont boldFont,
            float margin,
            float fontSize,
            float lineHeight,
            boolean firstPage) throws IOException {
        PDPage page = new PDPage(size);
        document.addPage(page);
        try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
            float y = size.getHeight() - margin;
            for (int i = 0; i < lines.size(); i++) {
                String line = lines.get(i);
                PDFont selected = (firstPage && (i == 0 || i == 1)) ? boldFont : font;
                try {
                    selected.getStringWidth(line);
                } catch (IOException | IllegalArgumentException unsupported) {
                    throw new IllegalStateException(
                            "Invoice text contains characters unsupported by the configured PDF font; set billing.invoice.font-path to a licensed Unicode font",
                            unsupported);
                }
                stream.beginText();
                stream.setFont(selected, firstPage && i == 0 ? fontSize + 2f : fontSize);
                stream.newLineAtOffset(margin, y);
                stream.showText(line);
                stream.endText();
                y -= lineHeight;
            }
        }
    }

    private static void addWrapped(List<String> lines, String value, int maxChars) {
        if (value == null || value.isBlank()) {
            return;
        }
        String remaining = value.replaceAll("\\s+", " ").trim();
        while (remaining.length() > maxChars) {
            int breakAt = remaining.lastIndexOf(' ', maxChars);
            if (breakAt <= 0) {
                breakAt = maxChars;
            }
            lines.add(remaining.substring(0, breakAt));
            remaining = remaining.substring(breakAt).trim();
        }
        if (!remaining.isEmpty()) {
            lines.add(remaining);
        }
    }

    private static String padBetween(String left, String right, int targetWidth) {
        int spaces = targetWidth - (left.length() + right.length());
        if (spaces <= 1) {
            return left + " " + right;
        }
        return left + " ".repeat(spaces) + right;
    }

    private static String center(String text, int targetWidth) {
        if (text == null) return "";
        String trimmed = text.trim();
        if (trimmed.length() >= targetWidth) return trimmed;
        int pad = (targetWidth - trimmed.length()) / 2;
        return " ".repeat(pad) + trimmed;
    }

    private static String repeatChar(char c, int count) {
        return String.valueOf(c).repeat(Math.max(0, count));
    }

    private static String formatDateTime(java.time.Instant instant) {
        if (instant == null) return "—";
        try {
            return DATE_TIME_FORMATTER.format(instant);
        } catch (Exception e) {
            return DateTimeFormatter.ISO_INSTANT.format(instant);
        }
    }

    private static String joinNonBlank(String label, String value) {
        return blank(value) ? "" : label + value;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String money(BigDecimal amount) {
        if (amount == null) return "0.00";
        return amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }
}
