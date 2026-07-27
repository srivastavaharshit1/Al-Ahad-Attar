package com.alahadattars.service;

import com.alahadattars.dto.StoreSettingsRequest;
import com.alahadattars.dto.StoreSettingsResponse;
import com.alahadattars.entity.StoreSettings;
import org.springframework.web.multipart.MultipartFile;

public interface StoreSettingsService {
    StoreSettings getSettingsEntity();
    StoreSettingsResponse getSettings();
    StoreSettingsResponse updateSettings(StoreSettingsRequest request);
    String uploadLogo(MultipartFile file);
    String uploadNavbarLogo(MultipartFile file);
}
