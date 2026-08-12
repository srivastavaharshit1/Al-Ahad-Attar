package com.alahadattars.email;

import com.alahadattars.dto.email.AdminNewOrderEmailData;
import com.alahadattars.dto.email.EmailAddress;
import com.alahadattars.dto.email.EmailOrderItem;
import com.alahadattars.dto.email.OrderConfirmationEmailData;
import com.alahadattars.dto.email.OrderDeliveredEmailData;
import com.alahadattars.dto.email.OrderShippedEmailData;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies every email template: correct placeholder substitution, no leftover/broken markers,
 * well-formed HTML skeleton, graceful handling of optional/null fields, and that user-controlled
 * text is HTML-escaped (a customer name or address line is attacker-controlled input by the time
 * it reaches here). No Spring context needed — EmailTemplateBuilder is pure and stateless.
 */
class EmailTemplateBuilderTest {

    private static final String SUPPORT_EMAIL = "contact@alahadattars.com";

    // ------------------------------------------------------------------
    // Structural sanity — every template must produce a well-formed document
    // ------------------------------------------------------------------

    private void assertWellFormedHtmlDocument(String html) {
        assertTrue(html.trim().startsWith("<!DOCTYPE html>"), "must start with a doctype");
        assertTrue(html.contains("<html"), "must contain an <html> tag");
        assertTrue(html.trim().endsWith("</html>"), "must end with </html>");
        assertTrue(html.contains("<body"), "must contain a <body> tag");
        assertTrue(html.contains("</body>"), "must close the <body> tag");
        assertFalse(html.contains("{{"), "no unresolved {{placeholder}} markers should remain");
        assertFalse(html.contains("}}"), "no unresolved {{placeholder}} markers should remain");
        assertFalse(html.contains("null"), "no raw Java 'null' should ever leak into rendered HTML");
        assertTrue(html.contains("Al Ahad Attars"), "brand name must appear");
        assertTrue(html.contains(SUPPORT_EMAIL), "support email must appear in the footer");
    }

    // ------------------------------------------------------------------
    // 1. Welcome email
    // ------------------------------------------------------------------

    @Test
    void welcomeEmail_containsNameWelcomeMessageAndLoginButton() {
        String html = EmailTemplateBuilder.buildWelcomeEmail("Aisha Khan", "http://localhost:5173/login", SUPPORT_EMAIL);

        assertWellFormedHtmlDocument(html);
        assertTrue(html.contains("Welcome, Aisha Khan!"), "customer name must be substituted into the heading");
        assertTrue(html.contains("Thank you for creating an account"), "welcome message must be present");
        assertTrue(html.contains("href=\"http://localhost:5173/login\""), "login button must link to the login URL");
        assertTrue(html.contains("Sign In to Your Account"), "login button label must be present");
    }

    @Test
    void welcomeEmail_escapesHtmlInCustomerName() {
        String html = EmailTemplateBuilder.buildWelcomeEmail("<script>alert(1)</script>", "http://x/login", SUPPORT_EMAIL);

        assertFalse(html.contains("<script>alert(1)</script>"), "raw script tag must never appear unescaped");
        assertTrue(html.contains("&lt;script&gt;"), "the name must be HTML-escaped instead");
    }

    // ------------------------------------------------------------------
    // 2. Order confirmed
    // ------------------------------------------------------------------

    @Test
    void orderConfirmedEmail_containsAllRequiredFields() {
        OrderConfirmationEmailData data = new OrderConfirmationEmailData(
                "customer@example.com",
                "Imran Siddiqui",
                "ORD-ABC12345",
                "29 Jul 2026, 06:30 PM",
                List.of(
                        new EmailOrderItem("Royal Oud Attar", "12ml", 2, new BigDecimal("899.00")),
                        new EmailOrderItem("Musk Al Layl", "6ml", 1, new BigDecimal("450.00"))
                ),
                new EmailAddress("Imran Siddiqui", "+919810054321", "221B Aminabad Market", null, "Lucknow", "Uttar Pradesh", "226018", "India"),
                new BigDecimal("2248.00"),
                "ONLINE"
        );

        String html = EmailTemplateBuilder.buildOrderConfirmedEmail(data, SUPPORT_EMAIL);

        assertWellFormedHtmlDocument(html);
        assertTrue(html.contains("Imran Siddiqui"), "customer name must appear");
        assertTrue(html.contains("ORD-ABC12345"), "order number must appear");
        assertTrue(html.contains("29 Jul 2026, 06:30 PM"), "order date must appear");
        assertTrue(html.contains("Royal Oud Attar"), "first product name must appear");
        assertTrue(html.contains("Musk Al Layl"), "second product name must appear");
        assertTrue(html.contains("x2"), "quantity for the first item must appear");
        assertTrue(html.contains("₹1798.00"), "line total for 2 x ₹899.00 must be computed correctly");
        assertTrue(html.contains("₹2248.00"), "order total must appear");
        assertTrue(html.contains("ONLINE"), "payment method must appear");
        assertTrue(html.contains("221B Aminabad Market"), "shipping address line must appear");
        assertTrue(html.contains("Lucknow"), "shipping city must appear");
    }

    @Test
    void orderConfirmedEmail_handlesNullShippingAddressGracefully() {
        OrderConfirmationEmailData data = new OrderConfirmationEmailData(
                "customer@example.com", "Test User", "ORD-NOADDR", "29 Jul 2026",
                List.of(new EmailOrderItem("Test Product", "10ml", 1, BigDecimal.TEN)),
                null, BigDecimal.TEN, "ONLINE"
        );

        String html = EmailTemplateBuilder.buildOrderConfirmedEmail(data, SUPPORT_EMAIL);

        assertWellFormedHtmlDocument(html);
        assertFalse(html.contains("Shipping Address"), "the address section should be omitted entirely, not rendered empty");
    }

    // ------------------------------------------------------------------
    // 3. Order shipped
    // ------------------------------------------------------------------

    @Test
    void orderShippedEmail_withTrackingInfo_containsAllFields() {
        OrderShippedEmailData data = new OrderShippedEmailData(
                "customer@example.com", "Aisha Khan", "ORD-SHIP001",
                "TRK998877", "BlueDart", "02 Aug 2026"
        );

        String html = EmailTemplateBuilder.buildOrderShippedEmail(data, SUPPORT_EMAIL);

        assertWellFormedHtmlDocument(html);
        assertTrue(html.contains("ORD-SHIP001"));
        assertTrue(html.contains("TRK998877"), "tracking number must appear");
        assertTrue(html.contains("BlueDart"), "courier name must appear");
        assertTrue(html.contains("02 Aug 2026"), "estimated delivery must appear");
    }

    @Test
    void orderShippedEmail_withoutTrackingInfo_omitsTrackingRowsCleanly() {
        OrderShippedEmailData data = new OrderShippedEmailData(
                "customer@example.com", "Aisha Khan", "ORD-SHIP002", null, null, null
        );

        String html = EmailTemplateBuilder.buildOrderShippedEmail(data, SUPPORT_EMAIL);

        assertWellFormedHtmlDocument(html);
        assertTrue(html.contains("ORD-SHIP002"));
        assertTrue(html.contains("Tracking details will be added"), "should fall back to a pending-tracking message");
    }

    // ------------------------------------------------------------------
    // 4. Order delivered
    // ------------------------------------------------------------------

    @Test
    void orderDeliveredEmail_containsThankYouAndOrderSummary() {
        OrderDeliveredEmailData data = new OrderDeliveredEmailData(
                "customer@example.com", "Fatima R.", "ORD-DELIV01", "20 Jul 2026",
                List.of(new EmailOrderItem("Oud Royale", "12ml", 1, new BigDecimal("1299.00"))),
                new BigDecimal("1299.00")
        );

        String html = EmailTemplateBuilder.buildOrderDeliveredEmail(data, SUPPORT_EMAIL);

        assertWellFormedHtmlDocument(html);
        assertTrue(html.toLowerCase().contains("delivered"), "must clearly state the order was delivered");
        assertTrue(html.contains("Fatima R."), "customer name must appear");
        assertTrue(html.contains("ORD-DELIV01"));
        assertTrue(html.contains("Oud Royale"), "ordered product must appear in the summary");
        assertTrue(html.contains("₹1299.00"));
    }

    // ------------------------------------------------------------------
    // 5. Password reset
    // ------------------------------------------------------------------

    @Test
    void passwordResetEmail_containsSecureLinkAndExpiry() {
        String html = EmailTemplateBuilder.buildPasswordResetEmail(
                "Imran Siddiqui", "http://localhost:5173/reset-password?token=abc123", 30, SUPPORT_EMAIL
        );

        assertWellFormedHtmlDocument(html);
        assertTrue(html.contains("Imran Siddiqui"));
        assertTrue(html.contains("href=\"http://localhost:5173/reset-password?token=abc123\""), "reset button must link to the exact reset URL");
        assertTrue(html.contains("expires in 30 minutes"), "expiry time must be stated explicitly");
    }

    @Test
    void passwordResetEmail_reflectsCustomExpiryValue() {
        String html = EmailTemplateBuilder.buildPasswordResetEmail("User", "http://x/reset-password?token=t", 15, SUPPORT_EMAIL);
        assertTrue(html.contains("expires in 15 minutes"), "expiry copy must reflect the actual configured value, not a hardcoded one");
    }

    // ------------------------------------------------------------------
    // 6. Admin new-order notification
    // ------------------------------------------------------------------

    @Test
    void adminNewOrderEmail_containsCustomerPhoneAddressProductsAndAmount() {
        AdminNewOrderEmailData data = new AdminNewOrderEmailData(
                "ORD-ADMIN01",
                "Aisha Khan",
                "+919810012345",
                new EmailAddress("Aisha Khan", "+919810012345", "14 Hazratganj Road", "Near City Centre Mall", "Lucknow", "Uttar Pradesh", "226001", "India"),
                List.of(new EmailOrderItem("Saffron Bloom", "6ml", 3, new BigDecimal("650.00"))),
                new BigDecimal("1950.00")
        );

        String html = EmailTemplateBuilder.buildAdminNewOrderEmail(data, SUPPORT_EMAIL);

        assertWellFormedHtmlDocument(html);
        assertTrue(html.contains("New Order Received"));
        assertTrue(html.contains("ORD-ADMIN01"));
        assertTrue(html.contains("Aisha Khan"), "customer name must appear");
        assertTrue(html.contains("+919810012345"), "customer phone must appear");
        assertTrue(html.contains("14 Hazratganj Road"), "shipping address must appear");
        assertTrue(html.contains("Saffron Bloom"), "ordered product must appear");
        assertTrue(html.contains("₹1950.00"), "order total must appear");
    }

    @Test
    void adminNewOrderEmail_escapesHtmlInAddressLine() {
        AdminNewOrderEmailData data = new AdminNewOrderEmailData(
                "ORD-XSS01", "Test <b>User</b>", "+911234567890",
                new EmailAddress("Test User", "+911234567890", "<img src=x onerror=alert(1)>", null, "City", "State", "000000", "India"),
                List.of(new EmailOrderItem("Product", "1ml", 1, BigDecimal.ONE)),
                BigDecimal.ONE
        );

        String html = EmailTemplateBuilder.buildAdminNewOrderEmail(data, SUPPORT_EMAIL);

        assertFalse(html.contains("<img src=x onerror=alert(1)>"), "malicious address input must never appear unescaped");
        assertFalse(html.contains("<b>User</b>"), "customer name must be escaped even when it looks like markup");
    }
}
