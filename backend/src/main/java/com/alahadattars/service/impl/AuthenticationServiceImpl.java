package com.alahadattars.service.impl;

import com.alahadattars.dto.AuthenticationResponse;
import com.alahadattars.dto.ForgotPasswordRequest;
import com.alahadattars.dto.LoginRequest;
import com.alahadattars.dto.RegisterRequest;
import com.alahadattars.dto.ResetPasswordRequest;
import com.alahadattars.dto.UserResponse;
import com.alahadattars.entity.PasswordResetToken;
import com.alahadattars.entity.Role;
import com.alahadattars.entity.User;
import com.alahadattars.enums.RoleType;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ConflictException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.mapper.UserMapper;
import com.alahadattars.repository.PasswordResetTokenRepository;
import com.alahadattars.repository.RoleRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.security.CustomUserDetails;
import com.alahadattars.security.JwtService;
import com.alahadattars.service.AuthenticationService;
import com.alahadattars.service.EmailService;
import com.alahadattars.util.PhoneNumberHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements AuthenticationService {

    private static final int RESET_TOKEN_VALID_MINUTES = 30;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserMapper userMapper;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;

    @org.springframework.beans.factory.annotation.Value("${app.security.google-client-id:}")
    private String googleClientId;

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

        // @ValidPhoneNumber on RegisterRequest already rejected malformed input; parsing again
        // here (defense in depth) also gives us the canonical E.164 form to dedup/store against,
        // so "9876543210" and "+91 98765 43210" are recognized as the same number.
        PhoneNumberHelper.ParsedPhone parsedPhone = PhoneNumberHelper.parse(request.getPhone());
        if (parsedPhone == null) {
            throw new BadRequestException("Invalid phone number.");
        }

        if (userRepository.existsByPhone(parsedPhone.e164())) {
            log.warn("Registration failed: Phone number already exists: {}", parsedPhone.e164());
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
                .phone(parsedPhone.e164())
                .phoneCountryCode(parsedPhone.regionCode())
                .phoneNationalNumber(parsedPhone.nationalNumber())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        log.info("Adding user to role and saving to DB...");
        userRole.addUser(user);
        userRepository.save(user);

        emailService.sendWelcomeEmail(user.getEmail(), user.getFirstName() + " " + user.getLastName());

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

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty()) {
            // Don't reveal whether the email is registered — log and return the same
            // response either way, matching the controller's generic success message.
            log.info("Password reset requested for unknown email: {}", request.getEmail());
            return;
        }

        User user = userOpt.get();
        // One live token per user at a time — clear out anything previously issued.
        passwordResetTokenRepository.deleteByUser(user);

        String token = UUID.randomUUID().toString() + UUID.randomUUID().toString();
        passwordResetTokenRepository.save(PasswordResetToken.builder()
                .user(user)
                .token(token)
                .expiresAt(LocalDateTime.now().plusMinutes(RESET_TOKEN_VALID_MINUTES))
                .used(false)
                .build());

        // The raw token is only ever handed to EmailService, which delivers it over a secure
        // channel (the user's own inbox) — never logged. This log line stays at a hash-prefix
        // only: it's written at INFO level in every environment, and app logs are commonly
        // shipped to aggregators/ops tooling with a much wider readership than "people who
        // should be able to take over any user's account." A hash prefix is enough to
        // correlate a support ticket with a token row without being usable to redeem it.
        log.info("Password reset issued for user {} (token hash prefix {}, valid {} minutes)",
                user.getId(), sha256Prefix(token), RESET_TOKEN_VALID_MINUTES);

        emailService.sendPasswordResetEmail(
                user.getEmail(),
                user.getFirstName() + " " + user.getLastName(),
                token,
                RESET_TOKEN_VALID_MINUTES
        );
    }

    /** A non-reversible fingerprint for log correlation — never log the raw token itself. */
    private String sha256Prefix(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash, 0, 4);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is guaranteed available on every JDK; this branch is unreachable.
            throw new IllegalStateException(e);
        }
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset token"));

        if (resetToken.isUsed() || resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Invalid or expired reset token");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        log.info("Password reset successfully for user ID: {}", user.getId());
    }

    @Override
    @Transactional
    public AuthenticationResponse googleLogin(com.alahadattars.dto.GoogleAuthRequest request) {
        if (googleClientId == null || googleClientId.isEmpty()) {
            throw new com.alahadattars.exception.BadRequestException("Google Login is not configured on the server.");
        }

        try {
            com.google.api.client.http.javanet.NetHttpTransport transport = new com.google.api.client.http.javanet.NetHttpTransport();
            com.google.api.client.json.gson.GsonFactory jsonFactory = new com.google.api.client.json.gson.GsonFactory();

            com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier verifier = new com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier.Builder(transport, jsonFactory)
                    .setAudience(java.util.Collections.singletonList(googleClientId))
                    .build();

            com.google.api.client.googleapis.auth.oauth2.GoogleIdToken idToken = verifier.verify(request.getIdToken());
            if (idToken == null) {
                throw new com.alahadattars.exception.BadRequestException("Invalid Google ID token.");
            }

            com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());

            if (!emailVerified) {
                throw new com.alahadattars.exception.BadRequestException("Google email is not verified.");
            }

            Optional<User> userOpt = userRepository.findByEmail(email);
            User user;

            if (userOpt.isPresent()) {
                user = userOpt.get();
                // If they logged in with Google but existing user was LOCAL, we could update provider, 
                // but we can just let them log in anyway since they proved ownership of the email.
            } else {
                // New user. Do they have a phone number?
                if (request.getPhone() == null || request.getPhone().isBlank()) {
                    throw new com.alahadattars.exception.BadRequestException("REQUIRES_PHONE");
                }

                PhoneNumberHelper.ParsedPhone parsedPhone = PhoneNumberHelper.parse(request.getPhone());
                if (parsedPhone == null) {
                    throw new BadRequestException("Invalid phone number format.");
                }

                if (userRepository.existsByPhone(parsedPhone.e164())) {
                    throw new ConflictException("Phone number already exists on another account.");
                }

                Role userRole = roleRepository.findByName(RoleType.USER)
                        .orElseGet(() -> {
                            log.info("USER role not found, creating it.");
                            return roleRepository.save(Role.builder()
                                    .name(RoleType.USER)
                                    .description("Standard User Role")
                                    .build());
                        });

                String firstName = (String) payload.get("given_name");
                String lastName = (String) payload.get("family_name");
                if (lastName == null || lastName.isBlank()) lastName = "-"; // Satisfy @NotBlank
                if (firstName == null || firstName.isBlank()) firstName = "User";

                user = User.builder()
                        .firstName(firstName)
                        .lastName(lastName)
                        .email(email)
                        .phone(parsedPhone.e164())
                        .phoneCountryCode(parsedPhone.regionCode())
                        .phoneNationalNumber(parsedPhone.nationalNumber())
                        .password(passwordEncoder.encode(UUID.randomUUID().toString())) // Random password
                        .provider(com.alahadattars.enums.AuthProvider.GOOGLE)
                        .emailVerified(true) // Verified by Google
                        .build();

                userRole.addUser(user);
                userRepository.save(user);
                emailService.sendWelcomeEmail(user.getEmail(), user.getFirstName() + " " + user.getLastName());
            }

            CustomUserDetails userDetails = new CustomUserDetails(user);
            String jwtToken = jwtService.generateToken(userDetails);
            long expirationTime = jwtService.extractExpiration(jwtToken).getTime();

            return AuthenticationResponse.builder()
                    .token(jwtToken)
                    .expiresAt(expirationTime)
                    .user(userMapper.toUserResponse(user))
                    .build();

        } catch (java.io.IOException | java.security.GeneralSecurityException e) {
            log.error("Failed to verify Google ID token", e);
            throw new com.alahadattars.exception.BadRequestException("Failed to authenticate with Google.");
        }
    }
}
