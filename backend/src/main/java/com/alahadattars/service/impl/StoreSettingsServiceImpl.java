package com.alahadattars.service.impl;

import com.alahadattars.dto.StoreSettingsRequest;
import com.alahadattars.dto.StoreSettingsResponse;
import com.alahadattars.entity.StoreSettings;
import com.alahadattars.repository.StoreSettingsRepository;
import com.alahadattars.service.StoreSettingsService;
import com.alahadattars.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class StoreSettingsServiceImpl implements StoreSettingsService {

    private final StoreSettingsRepository storeSettingsRepository;
    private final StorageService storageService;

    @Override
    @Transactional
    public StoreSettings getSettingsEntity() {
        return storeSettingsRepository.findById(1L).orElseGet(() -> {
            log.info("Store settings not found. Initializing defaults.");
            StoreSettings defaults = StoreSettings.builder()
                    .id(1L)
                    .storeName("Al Ahad Attars")
                    .whatsappNumber("+91 50 000 0000")
                    .instagramHandle("@alahadattars")
                    .shippingCharge(new BigDecimal("50.00"))
                    .freeShippingThreshold(new BigDecimal("500.00"))
                    .privacyPolicy("Default Privacy Policy")
                    .termsOfService("Default Terms of Service")
                    .returnPolicy("Default Return Policy")
                    .businessAddress("123 Main Street")
                    .city("Dubai")
                    .state("Dubai")
                    .country("UAE")
                    .pincode("00000")
                    .phoneNumber("+971 50 123 4567")
                    .emailAddress("contact@alahadattars.com")
                    .businessHours("Mon - Sat: 10:00 AM - 7:00 PM")
                    .mapEmbedUrl("")
                    .build();
            return storeSettingsRepository.save(defaults);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public StoreSettingsResponse getSettings() {
        StoreSettings settings = getSettingsEntity();
        return mapToResponse(settings);
    }

    @Override
    @Transactional
    public StoreSettingsResponse updateSettings(StoreSettingsRequest request) {
        StoreSettings settings = getSettingsEntity();
        
        // Don't update brandLogoUrl from request, as it's handled by uploadLogo
        // Wait, what if they clear it? We can allow it if they send empty.
        
        settings.setStoreName(request.getStoreName());
        settings.setWhatsappNumber(request.getWhatsappNumber());
        settings.setInstagramHandle(request.getInstagramHandle());
        settings.setShippingCharge(request.getShippingCharge());
        settings.setFreeShippingThreshold(request.getFreeShippingThreshold());
        settings.setPrivacyPolicy(request.getPrivacyPolicy());
        settings.setTermsOfService(request.getTermsOfService());
        settings.setReturnPolicy(request.getReturnPolicy());
        settings.setBusinessAddress(request.getBusinessAddress());
        settings.setCity(request.getCity());
        settings.setState(request.getState());
        settings.setCountry(request.getCountry());
        settings.setPincode(request.getPincode());
        settings.setPhoneNumber(request.getPhoneNumber());
        settings.setEmailAddress(request.getEmailAddress());
        settings.setBusinessHours(request.getBusinessHours());
        settings.setMapEmbedUrl(request.getMapEmbedUrl());
        
        StoreSettings updated = storeSettingsRepository.save(settings);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public String uploadLogo(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !(contentType.equals("image/jpeg") || contentType.equals("image/png") || contentType.equals("image/webp"))) {
            throw new com.alahadattars.exception.BadRequestException("Invalid file type. Only PNG, JPG, JPEG, and WEBP are allowed.");
        }

        String objectKey = storageService.uploadFile(file, "branding");

        StoreSettings settings = getSettingsEntity();

        if (settings.getLogoFilePath() != null) {
            storageService.deleteFile(settings.getLogoFilePath());
        }

        String resolvedUrl = storageService.resolveUrl(objectKey, "/api/settings/logo/content");
        settings.setLogoFilePath(objectKey);
        settings.setBrandLogoUrl(resolvedUrl);
        storeSettingsRepository.save(settings);

        return resolvedUrl;
    }

    @Override
    @Transactional
    public String uploadNavbarLogo(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !(contentType.equals("image/jpeg") || contentType.equals("image/png") || contentType.equals("image/webp"))) {
            throw new com.alahadattars.exception.BadRequestException("Invalid file type. Only PNG, JPG, JPEG, and WEBP are allowed.");
        }

        String objectKey = storageService.uploadFile(file, "branding");

        StoreSettings settings = getSettingsEntity();

        if (settings.getNavbarLogoFilePath() != null) {
            storageService.deleteFile(settings.getNavbarLogoFilePath());
        }

        String resolvedUrl = storageService.resolveUrl(objectKey, "/api/settings/logo/navbar/content");
        settings.setNavbarLogoFilePath(objectKey);
        settings.setNavbarLogoUrl(resolvedUrl);
        storeSettingsRepository.save(settings);

        return resolvedUrl;
    }

    private StoreSettingsResponse mapToResponse(StoreSettings settings) {
        return StoreSettingsResponse.builder()
                .brandLogoUrl(settings.getBrandLogoUrl())
                .navbarLogoUrl(settings.getNavbarLogoUrl())
                .storeName(settings.getStoreName())
                .whatsappNumber(settings.getWhatsappNumber())
                .instagramHandle(settings.getInstagramHandle())
                .shippingCharge(settings.getShippingCharge())
                .freeShippingThreshold(settings.getFreeShippingThreshold())
                .privacyPolicy(settings.getPrivacyPolicy())
                .termsOfService(settings.getTermsOfService())
                .returnPolicy(settings.getReturnPolicy())
                .businessAddress(settings.getBusinessAddress())
                .city(settings.getCity())
                .state(settings.getState())
                .country(settings.getCountry())
                .pincode(settings.getPincode())
                .phoneNumber(settings.getPhoneNumber())
                .emailAddress(settings.getEmailAddress())
                .businessHours(settings.getBusinessHours())
                .mapEmbedUrl(settings.getMapEmbedUrl())
                .build();
    }
}
