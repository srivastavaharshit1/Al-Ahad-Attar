package com.alahadattars.dto.profile;

import com.alahadattars.validation.ValidPhoneNumber;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddressRequest {

    @NotBlank(message = "Full name is required")
    @Schema(description = "Full name for the address", example = "John Doe")
    private String fullName;

    @NotBlank(message = "Phone number is required")
    @ValidPhoneNumber
    @Schema(description = "Contact phone number in E.164 format", example = "+919876543210")
    private String phone;

    @NotBlank(message = "Address Line 1 is required")
    @Schema(description = "Primary address line", example = "123 Main St")
    private String addressLine1;

    @Schema(description = "Secondary address line", example = "Apt 4B")
    private String addressLine2;

    @Schema(description = "Landmark", example = "Near Central Park")
    private String landmark;

    @NotBlank(message = "City is required")
    @Schema(description = "City", example = "New York")
    private String city;

    @NotBlank(message = "State is required")
    @Schema(description = "State or Province", example = "NY")
    private String state;

    @NotBlank(message = "Postal code is required")
    @Pattern(regexp = "^[A-Za-z0-9\\s-]{3,10}$", message = "Postal code format is invalid")
    @Schema(description = "Postal code", example = "10001")
    private String postalCode;

    @NotBlank(message = "Country is required")
    @Schema(description = "Country", example = "USA")
    private String country;

    @Schema(description = "Set as default address", example = "true")
    private boolean defaultAddress;
}
