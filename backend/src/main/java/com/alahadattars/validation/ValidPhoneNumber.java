package com.alahadattars.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Validates that a String is a real, dialable international phone number, using Google's
 * libphonenumber (see {@link com.alahadattars.util.PhoneNumberHelper}). Rejects empty values,
 * malformed input, and numbers that are too short/too long/invalid for their country — replaces
 * the previously-inconsistent hand-written regexes across RegisterRequest/AddressRequest/
 * ProfileUpdateRequest.
 *
 * A number with a leading "+" (e.g. "+14155552671") is validated against its own embedded
 * country code. A number without one (e.g. "9876543210") is assumed to be an Indian number,
 * matching the frontend's default country selector.
 */
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidPhoneNumberValidator.class)
public @interface ValidPhoneNumber {

    String message() default "Invalid phone number. Please provide a valid phone number, e.g. +919876543210";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
