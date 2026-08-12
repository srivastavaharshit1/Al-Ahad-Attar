package com.alahadattars.service;

import com.alahadattars.dto.AuthenticationResponse;
import com.alahadattars.dto.ForgotPasswordRequest;
import com.alahadattars.dto.LoginRequest;
import com.alahadattars.dto.RegisterRequest;
import com.alahadattars.dto.ResetPasswordRequest;
import com.alahadattars.dto.UserResponse;

public interface AuthenticationService {
    AuthenticationResponse register(RegisterRequest request);
    AuthenticationResponse login(LoginRequest request);
    UserResponse getCurrentUser();
    void forgotPassword(ForgotPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);
}
