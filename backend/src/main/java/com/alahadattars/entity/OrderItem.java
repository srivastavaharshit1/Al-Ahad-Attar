package com.alahadattars.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "order_item",
    indexes = {
        @Index(name = "idx_order_item_order_id", columnList = "order_id"),
        @Index(name = "idx_order_item_variant_id", columnList = "variant_id"),
        @Index(name = "idx_order_item_gift_set_id", columnList = "gift_set_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class OrderItem extends BaseEntity {

    @ToString.Exclude
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id")
    private ProductVariant variant;

    @Column(name = "is_gift_set", nullable = false)
    @Builder.Default
    private boolean isGiftSet = false;

    @Column(name = "gift_set_id")
    private Long giftSetId;

    @Column(name = "gift_set_name")
    private String giftSetName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "gift_set_snapshot")
    private String giftSetSnapshot;

    @ToString.Exclude
    @OneToMany(mappedBy = "orderItem", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItemGiftSetComponent> giftSetComponents = new ArrayList<>();

    @NotNull
    @PositiveOrZero
    @Column(nullable = false)
    private Integer quantity;

    @NotNull
    @PositiveOrZero
    @Column(name = "original_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal originalPrice;

    @NotNull
    @PositiveOrZero
    @Column(name = "discount_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountAmount;

    @NotNull
    @PositiveOrZero
    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @NotNull
    @PositiveOrZero
    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "product_name")
    private String productName;

    @Column(name = "variant_size")
    private String variantSize;

    @Column(name = "bottle_id")
    private Long bottleId;

    @Column(name = "bottle_name")
    private String bottleName;

    @Column(name = "bottle_price", precision = 10, scale = 2)
    private BigDecimal bottlePrice;

    @Column(name = "free_item", nullable = false)
    @Builder.Default
    private boolean freeItem = false;

    @Column(name = "free_promotion_id")
    private Long freePromotionId;

    public boolean isGiftSet() {
        return isGiftSet;
    }

    public void setIsGiftSet(boolean isGiftSet) {
        this.isGiftSet = isGiftSet;
    }

    public void setGiftSet(boolean isGiftSet) {
        this.isGiftSet = isGiftSet;
    }

    public void addGiftSetComponent(OrderItemGiftSetComponent component) {
        if (this.giftSetComponents == null) {
            this.giftSetComponents = new ArrayList<>();
        }
        this.giftSetComponents.add(component);
        component.setOrderItem(this);
    }
}
