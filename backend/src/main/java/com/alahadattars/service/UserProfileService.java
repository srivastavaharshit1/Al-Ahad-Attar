package com.alahadattars.service;

import com.alahadattars.dto.profile.ChangePasswordRequest;
import com.alahadattars.dto.profile.ProfileUpdateRequest;
import com.alahadattars.dto.profile.UserProfileResponse;

public interface UserProfileService {
    UserProfileResponse getProfile(String email);
    UserProfileResponse updateProfile(String email, ProfileUpdateRequest request);
    void changePassword(String email, ChangePasswordRequest request);
}
