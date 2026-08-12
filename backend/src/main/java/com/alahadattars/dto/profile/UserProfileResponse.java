package com.alahadattars.dto.profile;

import com.alahadattars.enums.RoleType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {

    @Schema(description = "User ID", example = "1")
    private Long id;

    @Schema(description = "User's first name", example = "John")
    private String firstName;

    @Schema(description = "User's last name", example = "Doe")
    private String lastName;

    @Schema(description = "User's email", example = "john@example.com")
    private String email;

    @Schema(description = "User's phone number in E.164 format", example = "+919876543210")
    private String phone;

    @Schema(description = "Is email verified", example = "true")
    private boolean emailVerified;

    @Schema(description = "Is phone verified", example = "true")
    private boolean phoneVerified;

    @Schema(description = "User's role", example = "USER")
    private RoleType role;
}
