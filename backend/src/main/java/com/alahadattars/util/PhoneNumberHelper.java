package com.alahadattars.util;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber.PhoneNumber;

/**
 * Thin wrapper around Google's libphonenumber for validating, parsing, and normalizing phone
 * numbers. This is the single source of truth for phone validation in the backend — replaces
 * the three previously-inconsistent hand-written regexes (see PROJECT_REPORT.md).
 *
 * Numbers without a leading "+" are parsed assuming {@link #DEFAULT_REGION} (India, matching
 * the frontend's default country selector). Numbers with a leading "+" are parsed using their
 * own embedded country code regardless of the default region, so a correctly-entered US or UK
 * number works exactly the same whether or not a region hint is passed.
 */
public final class PhoneNumberHelper {

    public static final String DEFAULT_REGION = "IN";

    private static final PhoneNumberUtil PHONE_UTIL = PhoneNumberUtil.getInstance();

    private PhoneNumberHelper() {
    }

    /** Canonical parsed form: E.164 string, ISO 3166-1 alpha-2 region, and the national significant number. */
    public record ParsedPhone(String e164, String regionCode, String nationalNumber) {
    }

    public static boolean isValid(String rawNumber) {
        return isValid(rawNumber, DEFAULT_REGION);
    }

    public static boolean isValid(String rawNumber, String defaultRegion) {
        if (rawNumber == null || rawNumber.isBlank()) {
            return false;
        }
        try {
            PhoneNumber parsed = PHONE_UTIL.parse(rawNumber, defaultRegion);
            return PHONE_UTIL.isValidNumber(parsed);
        } catch (NumberParseException e) {
            return false;
        }
    }

    /** Returns null if the number is missing, malformed, or not a real assignable number. */
    public static ParsedPhone parse(String rawNumber) {
        return parse(rawNumber, DEFAULT_REGION);
    }

    public static ParsedPhone parse(String rawNumber, String defaultRegion) {
        if (rawNumber == null || rawNumber.isBlank()) {
            return null;
        }
        try {
            PhoneNumber parsed = PHONE_UTIL.parse(rawNumber, defaultRegion);
            if (!PHONE_UTIL.isValidNumber(parsed)) {
                return null;
            }
            String e164 = PHONE_UTIL.format(parsed, PhoneNumberUtil.PhoneNumberFormat.E164);
            String regionCode = PHONE_UTIL.getRegionCodeForNumber(parsed);
            String nationalNumber = String.valueOf(parsed.getNationalNumber());
            return new ParsedPhone(e164, regionCode, nationalNumber);
        } catch (NumberParseException e) {
            return null;
        }
    }
}
