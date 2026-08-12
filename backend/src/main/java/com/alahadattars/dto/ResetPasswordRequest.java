package com.alahadattars.dto;

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
public class ResetPasswordRequest {

    @NotBlank(message = "Reset token is required")
    @Schema(description = "The token from the reset-password link")
    private String token;

    @NotBlank(message = "New password is required")
    @Schema(description = "New password", example = "NewPass123!")
    private String newPassword;
}
