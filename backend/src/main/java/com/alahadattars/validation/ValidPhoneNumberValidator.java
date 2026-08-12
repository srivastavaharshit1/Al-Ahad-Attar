package com.alahadattars.validation;

import com.alahadattars.util.PhoneNumberHelper;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ValidPhoneNumberValidator implements ConstraintValidator<ValidPhoneNumber, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // Empty/blank is rejected here too (not just left to @NotBlank) so this annotation is a
        // complete, self-sufficient phone check even if used without @NotBlank elsewhere.
        return PhoneNumberHelper.isValid(value);
    }
}
