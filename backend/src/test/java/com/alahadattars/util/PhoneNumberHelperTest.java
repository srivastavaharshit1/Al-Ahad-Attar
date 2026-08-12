package com.alahadattars.util;

import com.google.i18n.phonenumbers.PhoneNumberUtil;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Covers every case explicitly required for the international phone number system: valid/invalid
 * Indian numbers, a US number, a UK number, empty input, too-short, too-long, and non-digit
 * characters — plus a few extra edge cases for completeness. US/UK "valid" test numbers are
 * generated via libphonenumber's own {@code getExampleNumber} rather than hand-picked, so the
 * test doesn't depend on assumptions about which specific numbers are allocated/reserved.
 */
class PhoneNumberHelperTest {

    private static final PhoneNumberUtil PHONE_UTIL = PhoneNumberUtil.getInstance();

    private String exampleE164(String region) {
        return PHONE_UTIL.format(PHONE_UTIL.getExampleNumber(region), PhoneNumberUtil.PhoneNumberFormat.E164);
    }

    // ------------------------------------------------------------------
    // Required cases
    // ------------------------------------------------------------------

    @Test
    void validIndianNumber_isValid() {
        assertTrue(PhoneNumberHelper.isValid("+919876543210"));
    }

    @Test
    void validIndianNumber_withoutPlusPrefix_isValidViaDefaultRegion() {
        // No "+" — PhoneNumberHelper assumes India, matching the frontend's default country.
        assertTrue(PhoneNumberHelper.isValid("9876543210"));
    }

    @Test
    void invalidIndianNumber_isRejected() {
        // "0" is India's domestic trunk prefix, never part of the national significant number
        // itself — this is well-formed length-wise (10 digits) but not a real assignable number.
        assertFalse(PhoneNumberHelper.isValid("+910123456789"));
    }

    @Test
    void validUsNumber_isValid() {
        assertTrue(PhoneNumberHelper.isValid(exampleE164("US")));
    }

    @Test
    void validUkNumber_isValid() {
        assertTrue(PhoneNumberHelper.isValid(exampleE164("GB")));
    }

    @Test
    void emptyNumber_isRejected() {
        assertFalse(PhoneNumberHelper.isValid(""));
    }

    @Test
    void blankNumber_isRejected() {
        assertFalse(PhoneNumberHelper.isValid("   "));
    }

    @Test
    void nullNumber_isRejected() {
        assertFalse(PhoneNumberHelper.isValid(null));
    }

    @Test
    void tooShortNumber_isRejected() {
        assertFalse(PhoneNumberHelper.isValid("+9112345"));
    }

    @Test
    void tooLongNumber_isRejected() {
        assertFalse(PhoneNumberHelper.isValid("+91987654321098765"));
    }

    @Test
    void invalidCharacters_alphabetic_isRejected() {
        assertFalse(PhoneNumberHelper.isValid("+91987ABCD10"));
    }

    @Test
    void invalidCharacters_symbols_isRejected() {
        assertFalse(PhoneNumberHelper.isValid("+91-98#765$210"));
    }

    @Test
    void invalidCharacters_wordString_isRejected() {
        assertFalse(PhoneNumberHelper.isValid("not-a-phone-number"));
    }

    // ------------------------------------------------------------------
    // parse() — decomposed storage (countryCode / nationalNumber)
    // ------------------------------------------------------------------

    @Test
    void parse_validIndianNumber_returnsCorrectRegionAndNationalNumber() {
        PhoneNumberHelper.ParsedPhone parsed = PhoneNumberHelper.parse("+919876543210");

        assertEquals("+919876543210", parsed.e164());
        assertEquals("IN", parsed.regionCode());
        assertEquals("9876543210", parsed.nationalNumber());
    }

    @Test
    void parse_numberWithoutPlus_normalizesToE164UsingDefaultRegion() {
        PhoneNumberHelper.ParsedPhone parsed = PhoneNumberHelper.parse("9876543210");

        assertEquals("+919876543210", parsed.e164());
        assertEquals("IN", parsed.regionCode());
    }

    @Test
    void parse_numberWithSpacesAndFormatting_stillParsesCorrectly() {
        PhoneNumberHelper.ParsedPhone parsed = PhoneNumberHelper.parse("+91 98765 43210");

        assertEquals("+919876543210", parsed.e164());
        assertEquals("9876543210", parsed.nationalNumber());
    }

    @Test
    void parse_usNumber_returnsUsRegion() {
        String usNumber = exampleE164("US");
        PhoneNumberHelper.ParsedPhone parsed = PhoneNumberHelper.parse(usNumber);

        assertEquals("US", parsed.regionCode());
        assertEquals(usNumber, parsed.e164());
    }

    @Test
    void parse_invalidNumber_returnsNull() {
        assertNull(PhoneNumberHelper.parse("+910123456789"));
    }

    @Test
    void parse_emptyNumber_returnsNull() {
        assertNull(PhoneNumberHelper.parse(""));
    }
}
