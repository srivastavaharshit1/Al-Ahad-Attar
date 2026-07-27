package com.alahadattars.dto.profile;

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
public class ChangePasswordRequest {

    @NotBlank(message = "Old password is required")
    @Schema(description = "Current password", example = "OldPass123!")
    private String oldPassword;

    @NotBlank(message = "New password is required")
    @Schema(description = "New password", example = "NewPass123!")
    private String newPassword;
}
