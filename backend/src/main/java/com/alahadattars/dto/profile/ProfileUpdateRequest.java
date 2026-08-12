package com.alahadattars.dto.profile;

import com.alahadattars.validation.ValidPhoneNumber;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileUpdateRequest {

    @NotBlank(message = "First name is required")
    @Schema(description = "First name", example = "John")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Schema(description = "Last name", example = "Doe")
    private String lastName;

    @NotBlank(message = "Phone number is required")
    @ValidPhoneNumber
    @Schema(description = "Phone number in E.164 format", example = "+919876543210")
    private String phone;
}
