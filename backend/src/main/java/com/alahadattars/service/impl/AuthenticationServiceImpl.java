package com.alahadattars.service.impl;

import com.alahadattars.dto.AuthenticationResponse;
import com.alahadattars.dto.LoginRequest;
import com.alahadattars.dto.RegisterRequest;
import com.alahadattars.dto.UserResponse;
import com.alahadattars.entity.Role;
import com.alahadattars.entity.User;
import com.alahadattars.enums.RoleType;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ConflictException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.mapper.UserMapper;
import com.alahadattars.repository.RoleRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.security.CustomUserDetails;
import com.alahadattars.security.JwtService;
import com.alahadattars.service.AuthenticationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements AuthenticationService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserMapper userMapper;

    @Override
    @Transactional
    public AuthenticationResponse register(RegisterRequest request) {
        log.debug("Attempting to register new user with email: {}", request.getEmail());
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            log.warn("Registration failed: Passwords do not match for email: {}", request.getEmail());
            throw new BadRequestException("Passwords do not match");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Registration failed: Email already exists: {}", request.getEmail());
            throw new ConflictException("Email already exists");
        }

        if (userRepository.existsByPhone(request.getPhone())) {
            log.warn("Registration failed: Phone number already exists: {}", request.getPhone());
            throw new ConflictException("Phone number already exists");
        }

        log.info("Checking if role USER exists in DB...");
        Role userRole = roleRepository.findByName(RoleType.USER)
                .orElseGet(() -> {
                    log.info("USER role not found, creating it.");
                    return roleRepository.save(Role.builder()
                            .name(RoleType.USER)
                            .description("Standard User Role")
                            .build());
                });

        log.info("Creating User entity object...");
        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        log.info("Adding user to role and saving to DB...");
        userRole.addUser(user);
        userRepository.save(user);

        log.info("Generating JWT for user...");
        CustomUserDetails userDetails = new CustomUserDetails(user);
        String jwtToken = jwtService.generateToken(userDetails);
        long expirationTime = jwtService.extractExpiration(jwtToken).getTime();

        log.info("User registered successfully in DB with ID: {}", user.getId());

        return AuthenticationResponse.builder()
                .token(jwtToken)
                .expiresAt(expirationTime)
                .user(userMapper.toUserResponse(user))
                .build();
    }

    @Override
    public AuthenticationResponse login(LoginRequest request) {
        log.debug("Attempting login for email: {}", request.getEmail());
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    log.warn("Login failed: User not found for email: {}", request.getEmail());
                    return new ResourceNotFoundException("User not found");
                });

        CustomUserDetails userDetails = new CustomUserDetails(user);
        String jwtToken = jwtService.generateToken(userDetails);
        long expirationTime = jwtService.extractExpiration(jwtToken).getTime();

        log.info("User logged in successfully with ID: {}", user.getId());

        return AuthenticationResponse.builder()
                .token(jwtToken)
                .expiresAt(expirationTime)
                .user(userMapper.toUserResponse(user))
                .build();
    }

    @Override
    public UserResponse getCurrentUser() {
        log.debug("Attempting to get current authenticated user");
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal().equals("anonymousUser")) {
            log.warn("Failed to get current user: User is not authenticated");
            throw new com.alahadattars.exception.UnauthorizedException("User is not authenticated");
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userMapper.toUserResponse(userDetails.getUser());
    }
}
