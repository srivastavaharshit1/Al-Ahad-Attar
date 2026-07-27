package com.alahadattars.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(
    name = "hero_banner",
    indexes = {
        @Index(name = "idx_hero_banner_active", columnList = "active"),
        @Index(name = "idx_hero_banner_display_order", columnList = "display_order")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class HeroBanner extends BaseEntity {

    @Column(length = 200)
    private String title;

    @Column(length = 500)
    private String subtitle;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "button_text", length = 100)
    private String buttonText;

    @Column(name = "button_url", length = 500)
    private String buttonUrl;

    @Column(length = 100)
    private String badge;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "mobile_image_url", length = 500)
    private String mobileImageUrl;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = false;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private int displayOrder = 0;
}
