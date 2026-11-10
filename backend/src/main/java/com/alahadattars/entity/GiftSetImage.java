package com.alahadattars.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(
    name = "gift_set_image",
    indexes = {
        @Index(name = "idx_gift_set_image_set_id", columnList = "gift_set_id"),
        @Index(name = "idx_gift_set_image_primary", columnList = "gift_set_id, is_primary")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class GiftSetImage extends BaseEntity {

    @ToString.Exclude
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gift_set_id", nullable = false)
    private GiftSet giftSet;

    @NotBlank(message = "Image URL is required")
    @Column(name = "image_url", nullable = false, length = 1000)
    private String imageUrl;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_primary", nullable = false)
    @Builder.Default
    private boolean isPrimary = false;

    @Column(name = "alt_text")
    private String altText;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}

