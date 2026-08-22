package com.alahadattars.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "store_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreSettings {

    @Id
    private Long id;

    private String brandLogoUrl;
    
    private String logoFilePath; // Original full logo
    
    private String navbarLogoUrl;
    
    private String navbarLogoFilePath; // Clean brand mark for navbar // Stores absolute path on disk
    
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
    
    @Column(columnDefinition = "TEXT")
    private String businessHours;
    
    @Column(columnDefinition = "TEXT")
    private String mapEmbedUrl;
    
    @Column(precision = 10, scale = 2)
    private BigDecimal shippingCharge;
    
    @Column(precision = 10, scale = 2)
    private BigDecimal freeShippingThreshold;
    
    @Column(columnDefinition = "TEXT")
    private String privacyPolicy;
    
    @Column(columnDefinition = "TEXT")
    private String termsOfService;
    
    @Column(columnDefinition = "TEXT")
    private String returnPolicy;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private Boolean isAnnouncementBarActive = true;
    
    private String customAnnouncementText;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
