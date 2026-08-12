package com.alahadattars.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import com.alahadattars.validation.ValidPhoneNumber;
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
    name = "address",
    indexes = {
        @Index(name = "idx_address_user_id", columnList = "user_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
// Batches lazy-loading of Address proxies (e.g. Order.shippingAddress across a paged order list)
// into one IN-clause query per page instead of one per order.
@org.hibernate.annotations.BatchSize(size = 20)
public class Address extends BaseEntity {

    @ToString.Exclude
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @NotBlank
    @ValidPhoneNumber
    @Column(nullable = false, length = 20)
    private String phone;

    // Same decomposed-storage pattern as User.phone — see the comment there.
    @Column(name = "phone_country_code", length = 5)
    private String phoneCountryCode;

    @Column(name = "phone_national_number", length = 15)
    private String phoneNationalNumber;

    @NotBlank
    @Column(name = "address_line1", nullable = false)
    private String addressLine1;

    @Column(name = "address_line2")
    private String addressLine2;

    @Column
    private String landmark;

    @NotBlank
    @Column(nullable = false)
    private String city;

    @NotBlank
    @Column(nullable = false)
    private String state;

    @NotBlank
    @Column(name = "postal_code", nullable = false, length = 20)
    private String postalCode;

    @NotBlank
    @Column(nullable = false)
    private String country;

    @Column(name = "default_address", nullable = false)
    @Builder.Default
    private boolean defaultAddress = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
