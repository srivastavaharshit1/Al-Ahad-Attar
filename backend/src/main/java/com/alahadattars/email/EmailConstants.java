package com.alahadattars.email;

/**
 * Central place for every string/value an email template or EmailService needs that isn't
 * request-specific data — subjects, brand identity, and the palette pulled from DESIGN.md so
 * templates stay visually consistent with the storefront without duplicating hex codes.
 */
public final class EmailConstants {

    private EmailConstants() {
    }

    // --- Subjects ---
    public static final String SUBJECT_WELCOME = "Welcome to Al Ahad Attars";
    public static final String SUBJECT_ORDER_CONFIRMED = "Order Confirmed — Al Ahad Attars";
    public static final String SUBJECT_ORDER_PACKED = "Your Order Has Been Packed — Al Ahad Attars";
    public static final String SUBJECT_ORDER_SHIPPED = "Your Order Has Shipped — Al Ahad Attars";
    public static final String SUBJECT_ORDER_DELIVERED = "Your Order Has Been Delivered — Al Ahad Attars";
    public static final String SUBJECT_PASSWORD_RESET = "Reset Your Password — Al Ahad Attars";
    public static final String SUBJECT_ADMIN_NEW_ORDER = "New Order Received — Al Ahad Attars";
    public static final String SUBJECT_ORDER_CANCELLED = "Order Cancelled — Al Ahad Attars";
    public static final String SUBJECT_REFUND_SUCCESSFUL = "Refund Processed — Al Ahad Attars";
    public static final String SUBJECT_ADMIN_ORDER_CANCELLED = "Customer Cancelled Order — Refund Required — Al Ahad Attars";
    public static final String SUBJECT_ADMIN_REFUND_FAILED = "ACTION REQUIRED: Refund Processing Failed — Al Ahad Attars";
    public static final String SUBJECT_ADMIN_STUCK_CHECKOUT = "ACTION REQUIRED: Stuck Checkout Detected — Al Ahad Attars";

    // --- Brand identity ---
    public static final String BRAND_NAME = "Al Ahad Attars";
    public static final String BRAND_TAGLINE = "Premium Arabic Fragrances";

    // --- Palette (DESIGN.md §2 — Color Palette & Roles) ---
    public static final String COLOR_INK = "#121c2a";
    public static final String COLOR_ACCENT = "#d4af37";
    public static final String COLOR_ACCENT_HOVER = "#b8860b";
    public static final String COLOR_BG = "#fbf9f5";
    public static final String COLOR_SURFACE = "#ffffff";
    public static final String COLOR_SURFACE_ALT = "#f5f1e8";
    public static final String COLOR_BORDER = "#e4dcc8";
    public static final String COLOR_TEXT = "#121c2a";
    public static final String COLOR_TEXT_SECONDARY = "#5b5346";
    public static final String COLOR_TEXT_INVERSE = "#fbf9f5";

    // --- Misc ---
    // Reset-link expiry is NOT duplicated here — the single source of truth is
    // AuthenticationServiceImpl's RESET_TOKEN_VALID_MINUTES, passed into the email builder
    // as a parameter so the copy in the email can never drift from the actual token TTL.
    public static final String LOGIN_PATH = "/login";
    public static final String RESET_PASSWORD_PATH = "/reset-password";
}
