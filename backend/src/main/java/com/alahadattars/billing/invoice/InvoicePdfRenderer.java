package com.alahadattars.billing.invoice;

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
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Component
public class InvoicePdfRenderer {
    private static final float A4_WIDTH = PDRectangle.A4.getWidth();
    private static final float A4_HEIGHT = PDRectangle.A4.getHeight();
    private static final float THERMAL_WIDTH = 80f * 72f / 25.4f;
    private static final int A4_LINES_PER_PAGE = 48;

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
                    drawPage(document, PDRectangle.A4, lines.subList(offset, end), font, boldFont, 44f, 9f, 13f, offset == 0);
                }
            } else {
                float height = Math.max(240f, 28f + lines.size() * 11f);
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
        int width = format == InvoicePaperFormat.A4 ? 96 : 33;
        List<String> lines = new ArrayList<>();
        addWrapped(lines, invoice.seller().name(), width);
        addWrapped(lines, "INVOICE " + invoice.invoiceNumber(), width);
        lines.add("Issued: " + DateTimeFormatter.ISO_INSTANT.format(invoice.issuedAt()));
        addWrapped(lines, value(invoice.seller().address()), width);
        addWrapped(lines, joinNonBlank("Phone: ", invoice.seller().phone()), width);
        addWrapped(lines, joinNonBlank("Email: ", invoice.seller().email()), width);
        lines.add("----------------------------------------");
        lines.add("Customer: " + (invoice.customer() == null ? "Walk-in" : value(invoice.customer().name())));
        if (invoice.customer() != null) {
            addWrapped(lines, joinNonBlank("Mobile: ", invoice.customer().mobile()), width);
            addWrapped(lines, joinNonBlank("Email: ", invoice.customer().email()), width);
        }
        lines.add("----------------------------------------");
        for (InvoiceLineSnapshot item : invoice.lines()) {
            String description = item.lineNumber() + ". " + item.quantity() + " x " + item.productName()
                    + (blank(item.variantSize()) ? "" : " / " + item.variantSize())
                    + (blank(item.bottleName()) ? "" : " / Bottle: " + item.bottleName());
            addWrapped(lines, description, width);
            if (item.freeItem()) {
                addWrapped(lines, "   FREE PROMOTIONAL ITEM", width);
            }
            addWrapped(lines, "   INR " + money(item.unitPrice()) + " each; bottle INR " + money(item.bottlePrice()), width);
            addWrapped(lines, "   Promotion INR " + money(item.promotionDiscount())
                    + "; manual discount INR " + money(item.manualDiscount()), width);
            addWrapped(lines, "   Line total INR " + money(item.lineTotal()), width);
        }
        lines.add("----------------------------------------");
        addWrapped(lines, "Subtotal: INR " + money(invoice.subtotal()), width);
        addWrapped(lines, "Promotion discounts: INR " + money(invoice.promotionDiscount()), width);
        addWrapped(lines, "Manual discounts: INR " + money(invoice.manualDiscount()), width);
        addWrapped(lines, "TOTAL: INR " + money(invoice.total()), width);
        if (invoice.tax().status() == GstStatus.UNREGISTERED) {
            addWrapped(lines, "GST status: UNREGISTERED; tax mode: NO_GST.", width);
            addWrapped(lines, invoice.invoiceNoticeSnapshot(), width);
        }
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
                PDFont selected = firstPage && i == 0 ? boldFont : font;
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
        if (value.isBlank()) {
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

    private static String joinNonBlank(String label, String value) {
        return blank(value) ? "" : label + value;
    }

    private static String value(String value) {
        return blank(value) ? "—" : value;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String money(java.math.BigDecimal amount) {
        return amount.setScale(2, java.math.RoundingMode.UNNECESSARY).toPlainString();
    }
}
