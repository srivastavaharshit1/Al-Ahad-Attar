package com.alahadattars.validation;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies {@code @ValidPhoneNumber} actually wires up correctly as a Jakarta Bean Validation
 * constraint — i.e. that a DTO field annotated with it is rejected/accepted exactly like
 * PhoneNumberHelperTest proves the underlying helper does, through the real annotation-processing
 * path (no Spring context needed; Jakarta Validation can be exercised standalone).
 */
class ValidPhoneNumberValidatorTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @NoArgsConstructor
    @AllArgsConstructor
    static class PhoneHolder {
        @ValidPhoneNumber
        String phone;
    }

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @Test
    void validIndianNumber_producesNoViolations() {
        Set<ConstraintViolation<PhoneHolder>> violations = validator.validate(new PhoneHolder("+919876543210"));
        assertTrue(violations.isEmpty());
    }

    @Test
    void invalidNumber_producesOneViolationWithConfiguredMessage() {
        Set<ConstraintViolation<PhoneHolder>> violations = validator.validate(new PhoneHolder("+910123456789"));

        assertEquals(1, violations.size());
        assertEquals("Invalid phone number. Please provide a valid phone number, e.g. +919876543210",
                violations.iterator().next().getMessage());
    }

    @Test
    void emptyString_producesOneViolation() {
        Set<ConstraintViolation<PhoneHolder>> violations = validator.validate(new PhoneHolder(""));
        assertEquals(1, violations.size());
    }

    @Test
    void nullValue_producesOneViolation() {
        Set<ConstraintViolation<PhoneHolder>> violations = validator.validate(new PhoneHolder((String) null));
        assertEquals(1, violations.size());
    }

    @Test
    void tooLongNumber_producesOneViolation() {
        Set<ConstraintViolation<PhoneHolder>> violations = validator.validate(new PhoneHolder("+91987654321098765"));
        assertEquals(1, violations.size());
    }

    @Test
    void nonDigitCharacters_producesOneViolation() {
        Set<ConstraintViolation<PhoneHolder>> violations = validator.validate(new PhoneHolder("+91987ABCD10"));
        assertEquals(1, violations.size());
    }
}
