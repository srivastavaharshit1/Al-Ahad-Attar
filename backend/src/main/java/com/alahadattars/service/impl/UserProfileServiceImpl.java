package com.alahadattars.service.impl;

import com.alahadattars.dto.profile.ChangePasswordRequest;
import com.alahadattars.dto.profile.ProfileUpdateRequest;
import com.alahadattars.dto.profile.UserProfileResponse;
import com.alahadattars.entity.User;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ConflictException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.mapper.UserProfileMapper;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {

    private final UserRepository userRepository;
    private final UserProfileMapper userProfileMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserProfileResponse getProfile(String email) {
        User user = getUserByEmail(email);
        return userProfileMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserProfileResponse updateProfile(String email, ProfileUpdateRequest request) {
        User user = getUserByEmail(email);

        if (!user.getPhone().equals(request.getPhone())) {
            if (userRepository.existsByPhone(request.getPhone())) {
                throw new ConflictException("Phone number already exists");
            }
            user.setPhone(request.getPhone());
            user.setPhoneVerified(false); // Reset verification if phone changes
        }

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());

        User updatedUser = userRepository.save(user);
        log.info("User profile updated for email: {}", email);
        return userProfileMapper.toResponse(updatedUser);
    }

    @Override
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = getUserByEmail(email);

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid old password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Password changed for email: {}", email);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
