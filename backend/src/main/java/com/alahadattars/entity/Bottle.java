package com.alahadattars.entity;

import com.alahadattars.enums.BottleApplicability;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;

@Entity
@Table(name = "bottle")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class Bottle extends BaseEntity {

    @NotBlank
    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @NotNull
    @PositiveOrZero
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(length = 50)
    private String capacity;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @NotNull
    @PositiveOrZero
    @Column(nullable = false, name = "stock_quantity", columnDefinition = "integer default 0")
    @Builder.Default
    private Integer stockQuantity = 0;

    @NotNull
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(name = "applicability", length = 20, nullable = false, columnDefinition = "varchar(20) default 'BOTH'")
    @Builder.Default
    private BottleApplicability applicability = BottleApplicability.BOTH;
}
