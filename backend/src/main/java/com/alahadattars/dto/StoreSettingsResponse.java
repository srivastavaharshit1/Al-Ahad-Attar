package com.alahadattars.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreSettingsResponse {
    private String brandLogoUrl;
    private String navbarLogoUrl;
    private String storeName;
    private String whatsappNumber;
    private String instagramHandle;
    private String businessAddress;
    private String city;
    private String state;
    private String country;
    private String pincode;
    private String phoneNumber;
    private String emailAddress;
    private String businessHours;
    private String mapEmbedUrl;
    private BigDecimal shippingCharge;
    private BigDecimal freeShippingThreshold;
    private String privacyPolicy;
    private String termsOfService;
    private String returnPolicy;
}
