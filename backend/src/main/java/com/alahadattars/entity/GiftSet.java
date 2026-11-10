package com.alahadattars.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "gift_set",
    indexes = {
        @Index(name = "idx_gift_set_slug", columnList = "slug"),
        @Index(name = "idx_gift_set_active", columnList = "active"),
        @Index(name = "idx_gift_set_featured", columnList = "featured, active"),
        @Index(name = "idx_gift_set_display_order", columnList = "display_order")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class GiftSet extends BaseEntity {

    @NotBlank(message = "Gift set name is required")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Slug is required")
    @Column(nullable = false, unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than zero")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @DecimalMin(value = "0.01", message = "Sale price must be greater than zero")
    @Column(name = "sale_price", precision = 10, scale = 2)
    private BigDecimal salePrice;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean featured = false;

    @Column(name = "packaging_notes", columnDefinition = "TEXT")
    private String packagingNotes;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @ToString.Exclude
    @OneToMany(mappedBy = "giftSet", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    private List<GiftSetItem> items = new ArrayList<>();

    @ToString.Exclude
    @OneToMany(mappedBy = "giftSet", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    private List<GiftSetImage> images = new ArrayList<>();

    public void addItem(GiftSetItem item) {
        items.add(item);
        item.setGiftSet(this);
    }

    public void removeItem(GiftSetItem item) {
        items.remove(item);
        item.setGiftSet(null);
    }

    public void addImage(GiftSetImage image) {
        images.add(image);
        image.setGiftSet(this);
    }

    public void removeImage(GiftSetImage image) {
        images.remove(image);
        image.setGiftSet(null);
    }
}

