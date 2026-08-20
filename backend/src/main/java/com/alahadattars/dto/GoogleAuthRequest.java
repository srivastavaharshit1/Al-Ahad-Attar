package com.alahadattars.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class GoogleAuthRequest {
    @NotBlank
    private String idToken;
    
    // Optional, provided when the user is completing registration after the initial Google sign-in
    private String phone;
}
