package com.alahadattars.email;

import com.alahadattars.dto.email.AdminNewOrderEmailData;
import com.alahadattars.dto.email.AdminOrderCancelledEmailData;
import com.alahadattars.dto.email.AdminStuckCheckoutEmailData;
import com.alahadattars.dto.email.AdminRefundFailedEmailData;
import com.alahadattars.dto.email.EmailAddress;
import com.alahadattars.dto.email.EmailOrderItem;
import com.alahadattars.dto.email.OrderCancelledEmailData;
import com.alahadattars.dto.email.OrderConfirmationEmailData;
import com.alahadattars.dto.email.OrderDeliveredEmailData;
import com.alahadattars.dto.email.OrderPackedEmailData;
import com.alahadattars.dto.email.OrderShippedEmailData;
import com.alahadattars.dto.email.RefundSuccessfulEmailData;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;

import static com.alahadattars.email.EmailConstants.BRAND_NAME;
import static com.alahadattars.email.EmailConstants.BRAND_TAGLINE;
import static com.alahadattars.email.EmailConstants.COLOR_ACCENT;
import static com.alahadattars.email.EmailConstants.COLOR_ACCENT_HOVER;
import static com.alahadattars.email.EmailConstants.COLOR_BG;
import static com.alahadattars.email.EmailConstants.COLOR_BORDER;
import static com.alahadattars.email.EmailConstants.COLOR_INK;
import static com.alahadattars.email.EmailConstants.COLOR_SURFACE;
import static com.alahadattars.email.EmailConstants.COLOR_SURFACE_ALT;
import static com.alahadattars.email.EmailConstants.COLOR_TEXT_INVERSE;
import static com.alahadattars.email.EmailConstants.COLOR_TEXT_SECONDARY;

/**
 * Builds the HTML body for every transactional email. Pure and stateless — no Spring
 * dependencies, no shared/static mutable state — so every template can be rendered and
 * asserted on in a plain unit test with no application context. All dynamic values are
 * HTML-escaped before insertion (several — customer name, address lines, product names —
 * ultimately come from user input).
 *
 * Layout is a table-based "bulletproof" email pattern (works across Outlook/Gmail/Apple
 * Mail/etc. without relying on modern CSS support), capped at 600px, with a light
 * {@code @media} query for small screens for the clients that do honor it.
 */
public final class EmailTemplateBuilder {

    private EmailTemplateBuilder() {
    }

    // ------------------------------------------------------------------
    // Public template builders
    // ------------------------------------------------------------------

    public static String buildWelcomeEmail(String customerName, String loginUrl, String supportEmail) {
        String body = heading("Welcome, " + esc(customerName) + "!")
                + paragraph("Thank you for creating an account with " + BRAND_NAME
                        + ". We're delighted to welcome you into a world of authentic, handcrafted "
                        + "Arabic attars, bakhoor, and perfumes.")
                + paragraph("Your account is ready — sign in any time to explore our collection, "
                        + "track orders, and manage your wishlist.")
                + buttonRow("Sign In to Your Account", loginUrl)
                + paragraph("If you didn't create this account, you can safely ignore this email.");
        return wrapLayout("Welcome to " + BRAND_NAME, body, supportEmail);
    }

    public static String buildOrderConfirmedEmail(OrderConfirmationEmailData data, String supportEmail) {
        StringBuilder body = new StringBuilder();
        body.append(heading("Order Confirmed"));
        body.append(paragraph("Hi " + esc(data.customerName()) + ", thank you for your order! "
                + "We've received your payment and are getting it ready."));

        body.append(infoCard(List.of(
                infoRow("Order Number", data.orderNumber()),
                infoRow("Order Date", data.orderDate()),
                infoRow("Payment Method", data.paymentMethod())
        )));

        body.append(sectionLabel("Items Ordered"));
        body.append(itemsTable(data.items()));
        body.append(totalRow("Total Paid", data.totalAmount()));

        if (data.shippingAddress() != null) {
            body.append(sectionLabel("Shipping Address"));
            body.append(addressBlock(data.shippingAddress()));
        }

        body.append(paragraph("We'll send you another email as soon as your order ships."));
        return wrapLayout("Your order " + data.orderNumber() + " is confirmed", body.toString(), supportEmail);
    }

    public static String buildOrderPackedEmail(OrderPackedEmailData data, String supportEmail) {
        StringBuilder body = new StringBuilder();
        body.append(heading("Your Order Has Been Packed"));
        body.append(paragraph("Hi " + esc(data.customerName()) + ", your order has been carefully packed "
                + "and is getting ready to ship. We'll send another email with tracking details as soon as it's on its way."));

        body.append(infoCard(List.of(
                infoRow("Order Number", data.orderNumber())
        )));

        return wrapLayout("Your order " + data.orderNumber() + " has been packed", body.toString(), supportEmail);
    }

    public static String buildOrderShippedEmail(OrderShippedEmailData data, String supportEmail) {
        StringBuilder body = new StringBuilder();
        body.append(heading("Your Order Has Shipped"));
        body.append(paragraph("Hi " + esc(data.customerName()) + ", great news — your order is on its way!"));

        List<String> rows = new ArrayList<>();
        rows.add(infoRow("Order Number", data.orderNumber()));
        if (isSet(data.courierName())) {
            rows.add(infoRow("Courier", data.courierName()));
        }
        if (isSet(data.trackingNumber())) {
            rows.add(infoRow("Tracking Number", data.trackingNumber()));
        }
        if (isSet(data.estimatedDelivery())) {
            rows.add(infoRow("Estimated Delivery", data.estimatedDelivery()));
        }
        body.append(infoCard(rows));

        if (!isSet(data.trackingNumber())) {
            body.append(paragraph("Tracking details will be added as soon as they're available."));
        }
        return wrapLayout("Your order " + data.orderNumber() + " has shipped", body.toString(), supportEmail);
    }

    public static String buildOrderDeliveredEmail(OrderDeliveredEmailData data, String supportEmail) {
        StringBuilder body = new StringBuilder();
        body.append(heading("Delivered! Enjoy Your Fragrance"));
        body.append(paragraph("Hi " + esc(data.customerName()) + ", your order has been delivered. "
                + "Thank you for choosing " + BRAND_NAME + " — we hope it brings you joy."));

        body.append(infoCard(List.of(
                infoRow("Order Number", data.orderNumber()),
                infoRow("Order Date", data.orderDate())
        )));

        body.append(sectionLabel("Order Summary"));
        body.append(itemsTable(data.items()));
        body.append(totalRow("Total Paid", data.totalAmount()));

        body.append(paragraph("Loved your fragrance? We'd appreciate a review — it helps other "
                + "customers discover their next favorite scent."));
        return wrapLayout("Your order " + data.orderNumber() + " was delivered", body.toString(), supportEmail);
    }

    public static String buildPasswordResetEmail(String customerName, String resetUrl, int expiryMinutes, String supportEmail) {
        String body = heading("Reset Your Password")
                + paragraph("Hi " + esc(customerName) + ", we received a request to reset your "
                        + BRAND_NAME + " account password.")
                + buttonRow("Reset Password", resetUrl)
                + paragraph("This link expires in " + expiryMinutes + " minutes. If you didn't "
                        + "request a password reset, you can safely ignore this email — your "
                        + "password will remain unchanged.")
                + smallMuted("If the button above doesn't work, copy and paste this link into "
                        + "your browser: " + esc(resetUrl));
        return wrapLayout("Reset your " + BRAND_NAME + " password", body, supportEmail);
    }

    public static String buildAdminNewOrderEmail(AdminNewOrderEmailData data, String supportEmail) {
        StringBuilder body = new StringBuilder();
        body.append(heading("New Order Received"));
        body.append(paragraph("A new order has just been placed."));

        body.append(infoCard(List.of(
                infoRow("Order Number", data.orderNumber()),
                infoRow("Customer Name", data.customerName()),
                infoRow("Phone", data.customerPhone())
        )));

        if (data.shippingAddress() != null) {
            body.append(sectionLabel("Shipping Address"));
            body.append(addressBlock(data.shippingAddress()));
        }

        body.append(sectionLabel("Items"));
        body.append(itemsTable(data.items()));
        body.append(totalRow("Order Total", data.totalAmount()));

        return wrapLayout("New order " + data.orderNumber(), body.toString(), supportEmail);
    }

    public static String buildOrderCancelledEmail(OrderCancelledEmailData data, String supportEmail) {
        StringBuilder body = new StringBuilder();
        body.append(heading("Your Order Has Been Cancelled"));
        body.append(paragraph("Hi " + esc(data.customerName()) + ", as requested, we've cancelled your order."));

        body.append(infoCard(List.of(
                infoRow("Order Number", data.orderNumber()),
                infoRow("Cancelled On", data.cancelledDate()),
                infoRow("Order Total", formatMoney(data.totalAmount()))
        )));

        if (data.refundRequired()) {
            body.append(paragraph("Since this order was already paid for, your full refund is now being "
                    + "processed by our team. You'll receive a separate email as soon as it's complete."));
        } else {
            body.append(paragraph("No payment was collected for this order, so there's nothing to refund."));
        }

        body.append(paragraph("If you didn't request this cancellation or have any questions, please "
                + "get in touch with us."));
        return wrapLayout("Your order " + data.orderNumber() + " has been cancelled", body.toString(), supportEmail);
    }

    public static String buildRefundSuccessfulEmail(RefundSuccessfulEmailData data, String supportEmail) {
        StringBuilder body = new StringBuilder();
        body.append(heading("Refund Processed Successfully"));
        body.append(paragraph("Hi " + esc(data.customerName()) + ", your refund has been processed."));

        List<String> rows = new ArrayList<>();
        rows.add(infoRow("Order Number", data.orderNumber()));
        rows.add(infoRow("Refund Amount", formatMoney(data.refundAmount())));
        if (isSet(data.razorpayRefundId())) {
            rows.add(infoRow("Refund Reference", data.razorpayRefundId()));
        }
        rows.add(infoRow("Processed On", data.refundDate()));
        body.append(infoCard(rows));

        body.append(paragraph("The refunded amount will reflect in your original payment method within "
                + "5–7 business days, depending on your bank or card issuer."));
        return wrapLayout("Refund processed for order " + data.orderNumber(), body.toString(), supportEmail);
    }

    public static String buildAdminOrderCancelledEmail(AdminOrderCancelledEmailData data, String supportEmail) {
        boolean refundRequired = "REFUND_REQUIRED".equals(data.refundStatus());

        StringBuilder body = new StringBuilder();
        body.append(heading("Order Cancelled"));
        body.append(paragraph("An order has just been cancelled."));

        body.append(infoCard(List.of(
                infoRow("Order Number", data.orderNumber()),
                infoRow("Customer Name", data.customerName()),
                infoRow("Order Total", formatMoney(data.totalAmount())),
                infoRow("Refund Status", data.refundStatus())
        )));

        if (refundRequired) {
            body.append(paragraph("This order was already paid for — a full refund is required. "
                    + "Process it from the Refunds section of the admin dashboard when ready."));
        } else {
            body.append(paragraph("No payment was collected for this order, so no refund is required."));
        }

        return wrapLayout("Order " + data.orderNumber() + " was cancelled" + (refundRequired ? " — refund required" : ""),
                body.toString(), supportEmail);
    }

    public static String buildAdminRefundFailedEmail(AdminRefundFailedEmailData data, String supportEmail) {
        StringBuilder body = new StringBuilder();
        body.append(heading("Refund Processing Failed"));
        body.append(paragraph("A refund attempt for the order below did not succeed and needs attention."));

        body.append(infoCard(List.of(
                infoRow("Order Number", data.orderNumber()),
                infoRow("Customer Name", data.customerName()),
                infoRow("Refund Amount", formatMoney(data.refundAmount())),
                infoRow("Reason", isSet(data.failureReason()) ? data.failureReason() : "Not provided")
        )));

        body.append(paragraph("No additional refund has been created — review the payment status in the "
                + "Razorpay dashboard before retrying from the admin Refunds page."));

        return wrapLayout("Refund failed for order " + data.orderNumber(), body.toString(), supportEmail);
    }

    public static String buildAdminStuckCheckoutEmail(AdminStuckCheckoutEmailData data, String supportEmail) {
        StringBuilder body = new StringBuilder();
        body.append(heading("Stuck Checkout Detected"));
        body.append(paragraph("A customer paid successfully via Razorpay, but the browser lost connection before our system could create the Order."));

        body.append(infoCard(List.of(
                infoRow("Razorpay Order ID", data.razorpayOrderId()),
                infoRow("Razorpay Payment ID", data.razorpayPaymentId()),
                infoRow("Customer Email", data.customerEmail()),
                infoRow("Amount Captured", formatMoney(data.amount()))
        )));

        body.append(paragraph("This requires manual reconciliation. You should either issue a manual refund from the Razorpay Dashboard or manually place the order for the customer."));

        return wrapLayout("Stuck Checkout for payment " + data.razorpayPaymentId(), body.toString(), supportEmail);
    }

    // ------------------------------------------------------------------
    // Shared layout
    // ------------------------------------------------------------------

    private static String wrapLayout(String previewText, String bodyHtml, String supportEmail) {
        String escapedPreview = esc(previewText);
        String escapedSupportEmail = esc(supportEmail);
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%1$s</title>
                <style>
                  body, table, td { font-family: Georgia, 'Times New Roman', serif; }
                  body { margin: 0; padding: 0; background-color: %2$s; }
                  a { color: %3$s; }
                  @media only screen and (max-width: 600px) {
                    .email-container { width: 100%% !important; }
                    .email-padding { padding-left: 20px !important; padding-right: 20px !important; }
                  }
                </style>
                </head>
                <body style="margin:0; padding:0; background-color:%2$s;">
                  <!-- preview text, hidden -->
                  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">%1$s</div>
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:%2$s;">
                    <tr>
                      <td align="center" style="padding: 32px 16px;">
                        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:%4$s; border:1px solid %5$s; border-radius:8px; overflow:hidden;">
                          <tr>
                            <td align="center" style="background-color:%6$s; padding:28px 24px;">
                              <span style="font-family: Georgia, 'Times New Roman', serif; font-size:24px; font-weight:700; color:%3$s; letter-spacing:0.5px;">%7$s</span>
                              <div style="font-family: -apple-system, 'Segoe UI', sans-serif; font-size:10px; color:%3$s; text-transform:uppercase; letter-spacing:2px; margin-top:6px;">%8$s</div>
                            </td>
                          </tr>
                          <tr>
                            <td class="email-padding" style="padding:40px 32px; background-color:%4$s;">
                              %9$s
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="background-color:%6$s; padding:24px; font-family: -apple-system, 'Segoe UI', sans-serif;">
                              <div style="color:%3$s; font-size:12px; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px;">%8$s</div>
                              <div style="color:%10$s; font-size:13px;">Need help? Contact us at <a href="mailto:%11$s" style="color:%3$s;">%11$s</a></div>
                              <div style="color:%10$s; font-size:11px; margin-top:12px; opacity:0.6;">&copy; %12$d %7$s. All rights reserved.</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(
                escapedPreview,               // %1$s
                COLOR_BG,                     // %2$s
                COLOR_ACCENT,                 // %3$s
                COLOR_SURFACE,                // %4$s
                COLOR_BORDER,                 // %5$s
                COLOR_INK,                    // %6$s
                BRAND_NAME,                   // %7$s
                BRAND_TAGLINE,                // %8$s
                bodyHtml,                     // %9$s
                COLOR_TEXT_INVERSE,           // %10$s
                escapedSupportEmail,          // %11$s
                Year.now().getValue()         // %12$d
        );
    }

    // ------------------------------------------------------------------
    // Reusable fragments
    // ------------------------------------------------------------------

    // heading()/paragraph()/smallMuted() do NOT escape their argument — callers build these
    // strings by concatenating static copy with already-esc()'d dynamic values (see e.g.
    // buildWelcomeEmail's "Welcome, " + esc(customerName) + "!"). Escaping here too would
    // double-escape the dynamic part (customerName "O'Brien" -> "&amp;#39;" instead of "&#39;").

    private static String heading(String text) {
        return "<h1 style=\"margin:0 0 16px; font-family: Georgia, 'Times New Roman', serif; "
                + "font-size:26px; font-weight:700; color:" + COLOR_INK + ";\">" + text + "</h1>";
    }

    private static String paragraph(String text) {
        return "<p style=\"margin:0 0 20px; font-family: -apple-system, 'Segoe UI', sans-serif; "
                + "font-size:15px; line-height:1.6; color:" + COLOR_TEXT_SECONDARY + ";\">" + text + "</p>";
    }

    private static String smallMuted(String text) {
        return "<p style=\"margin:20px 0 0; font-family: -apple-system, 'Segoe UI', sans-serif; "
                + "font-size:12px; line-height:1.5; color:" + COLOR_TEXT_SECONDARY + "; opacity:0.8; word-break:break-all;\">" + text + "</p>";
    }

    private static String sectionLabel(String text) {
        return "<div style=\"margin:28px 0 12px; font-family: -apple-system, 'Segoe UI', sans-serif; "
                + "font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:1.5px; "
                + "color:" + COLOR_ACCENT_HOVER + "; border-bottom:1px solid " + COLOR_BORDER + "; padding-bottom:8px;\">"
                + esc(text) + "</div>";
    }

    private static String buttonRow(String label, String url) {
        // "Bulletproof" table-based button — renders correctly even in clients that strip
        // border-radius/box-shadow (Outlook desktop).
        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:8px 0 24px;\">"
                + "<tr><td align=\"center\" style=\"border-radius:6px; background-color:" + COLOR_ACCENT + ";\">"
                + "<a href=\"" + esc(url) + "\" target=\"_blank\" style=\"display:inline-block; padding:14px 32px; "
                + "font-family: -apple-system, 'Segoe UI', sans-serif; font-size:14px; font-weight:600; "
                + "letter-spacing:0.5px; color:" + COLOR_INK + "; text-decoration:none; border-radius:6px;\">"
                + esc(label) + "</a></td></tr></table>";
    }

    private static String infoRow(String label, String value) {
        if (!isSet(value)) {
            return "";
        }
        return "<tr>"
                + "<td style=\"padding:8px 0; font-family: -apple-system, 'Segoe UI', sans-serif; font-size:13px; "
                + "color:" + COLOR_TEXT_SECONDARY + "; white-space:nowrap;\">" + esc(label) + "</td>"
                + "<td style=\"padding:8px 0 8px 16px; font-family: -apple-system, 'Segoe UI', sans-serif; "
                + "font-size:13px; font-weight:600; color:" + COLOR_INK + "; text-align:right;\">" + esc(value) + "</td>"
                + "</tr>";
    }

    private static String infoCard(List<String> rows) {
        StringBuilder rowsHtml = new StringBuilder();
        for (String row : rows) {
            rowsHtml.append(row);
        }
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" "
                + "style=\"background-color:" + COLOR_SURFACE_ALT + "; border-radius:8px; padding:16px 20px; margin-bottom:8px;\">"
                + rowsHtml + "</table>";
    }

    private static String itemsTable(List<EmailOrderItem> items) {
        if (items == null || items.isEmpty()) {
            return paragraph("No items found for this order.");
        }
        StringBuilder rows = new StringBuilder();
        for (EmailOrderItem item : items) {
            String nameAndSize = item.productName() + (isSet(item.size()) ? " (" + item.size() + ")" : "");
            rows.append("<tr>")
                    .append("<td style=\"padding:10px 0; border-top:1px solid ").append(COLOR_BORDER)
                    .append("; font-family: -apple-system, 'Segoe UI', sans-serif; font-size:13px; color:").append(COLOR_INK).append(";\">")
                    .append(esc(nameAndSize)).append("</td>")
                    .append("<td style=\"padding:10px 0; border-top:1px solid ").append(COLOR_BORDER)
                    .append("; font-family: -apple-system, 'Segoe UI', sans-serif; font-size:13px; color:").append(COLOR_TEXT_SECONDARY)
                    .append("; text-align:center; white-space:nowrap;\">x").append(item.quantity()).append("</td>")
                    .append("<td style=\"padding:10px 0; border-top:1px solid ").append(COLOR_BORDER)
                    .append("; font-family: -apple-system, 'Segoe UI', sans-serif; font-size:13px; font-weight:600; color:").append(COLOR_INK)
                    .append("; text-align:right; white-space:nowrap;\">").append(formatMoney(item.lineTotal())).append("</td>")
                    .append("</tr>");
        }
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom:8px;\">"
                + rows + "</table>";
    }

    private static String totalRow(String label, BigDecimal amount) {
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" "
                + "style=\"margin:4px 0 8px; border-top:2px solid " + COLOR_INK + ";\">"
                + "<tr><td style=\"padding:12px 0 0; font-family: Georgia, 'Times New Roman', serif; "
                + "font-size:16px; font-weight:700; color:" + COLOR_INK + ";\">" + esc(label) + "</td>"
                + "<td style=\"padding:12px 0 0; font-family: Georgia, 'Times New Roman', serif; "
                + "font-size:16px; font-weight:700; color:" + COLOR_INK + "; text-align:right;\">"
                + formatMoney(amount) + "</td></tr></table>";
    }

    private static String addressBlock(EmailAddress addr) {
        StringBuilder lines = new StringBuilder();
        lines.append(esc(addr.fullName())).append("<br>");
        if (isSet(addr.addressLine1())) {
            lines.append(esc(addr.addressLine1())).append("<br>");
        }
        if (isSet(addr.addressLine2())) {
            lines.append(esc(addr.addressLine2())).append("<br>");
        }
        lines.append(esc(joinNonBlank(", ", addr.city(), addr.state(), addr.postalCode()))).append("<br>");
        if (isSet(addr.country())) {
            lines.append(esc(addr.country())).append("<br>");
        }
        if (isSet(addr.phone())) {
            lines.append("Phone: ").append(esc(addr.phone()));
        }
        return "<div style=\"font-family: -apple-system, 'Segoe UI', sans-serif; font-size:13px; "
                + "line-height:1.7; color:" + COLOR_TEXT_SECONDARY + "; background-color:" + COLOR_SURFACE_ALT
                + "; border-radius:8px; padding:16px 20px; margin-bottom:8px;\">" + lines + "</div>";
    }

    // ------------------------------------------------------------------
    // Utilities
    // ------------------------------------------------------------------

    private static boolean isSet(String s) {
        return s != null && !s.isBlank();
    }

    private static String joinNonBlank(String delimiter, String... parts) {
        StringBuilder out = new StringBuilder();
        for (String part : parts) {
            if (isSet(part)) {
                if (out.length() > 0) {
                    out.append(delimiter);
                }
                out.append(part);
            }
        }
        return out.toString();
    }

    private static String formatMoney(BigDecimal amount) {
        BigDecimal safe = amount == null ? BigDecimal.ZERO : amount;
        return "₹" + safe.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    /** HTML-escapes user-controlled text before it's inlined into a template. */
    private static String esc(String input) {
        if (input == null) {
            return "";
        }
        StringBuilder out = new StringBuilder(input.length());
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            switch (c) {
                case '&' -> out.append("&amp;");
                case '<' -> out.append("&lt;");
                case '>' -> out.append("&gt;");
                case '"' -> out.append("&quot;");
                case '\'' -> out.append("&#39;");
                default -> out.append(c);
            }
        }
        return out.toString();
    }
}
