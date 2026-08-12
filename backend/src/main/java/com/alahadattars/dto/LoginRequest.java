package com.alahadattars.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email is not valid")
    @Schema(description = "User's email address", example = "customer@example.com")
    private String email;

    @NotBlank(message = "Password is required")
    // No example: a real working password here is published verbatim by the OpenAPI document.
    @Schema(description = "User's password")
    private String password;
}
