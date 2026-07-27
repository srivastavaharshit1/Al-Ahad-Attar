package com.alahadattars.service;

import com.alahadattars.dto.AuthenticationResponse;
import com.alahadattars.dto.LoginRequest;
import com.alahadattars.dto.RegisterRequest;
import com.alahadattars.dto.UserResponse;

public interface AuthenticationService {
    AuthenticationResponse register(RegisterRequest request);
    AuthenticationResponse login(LoginRequest request);
    UserResponse getCurrentUser();
}
