package com.alahadattars.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import com.alahadattars.validation.ValidPhoneNumber;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Represents a user of the application.
 * Contains user profile and authentication information.
 */
@Entity
@Table(
    name = "users",
    indexes = {
        @Index(name = "idx_user_email", columnList = "email"),
        @Index(name = "idx_user_phone", columnList = "phone"),
        @Index(name = "idx_user_role_id", columnList = "role_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class User extends BaseEntity {

    @NotBlank
    @Column(name = "first_name", length = 120, nullable = false)
    private String firstName;

    @NotBlank
    @Column(name = "last_name", length = 120, nullable = false)
    private String lastName;

    @NotBlank
    @Email
    @Column(length = 150, nullable = false, unique = true)
    private String email;

    // Canonical E.164 phone (e.g. "+919876543210") — kept as the single source of truth for all
    // existing code (auth, WhatsApp notifications, email templates) so no API contract changes.
    @NotBlank
    @ValidPhoneNumber
    @Column(length = 20, nullable = false, unique = true)
    private String phone;

    // countryCode/nationalNumber are the SAME phone number stored decomposed, populated
    // alongside `phone` (see PhoneNumberHelper) — additive columns, not a replacement, so
    // existing rows/code paths that only know about `phone` are unaffected. Nullable because
    // rows created before this feature are backfilled asynchronously (see PhoneNumberBackfillRunner)
    // rather than blocking on it.
    @Column(name = "phone_country_code", length = 5)
    private String phoneCountryCode;

    @Column(name = "phone_national_number", length = 15)
    private String phoneNationalNumber;

    @NotBlank
    @Column(length = 255, nullable = false)
    private String password;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "phone_verified", nullable = false)
    @Builder.Default
    private boolean phoneVerified = false;

    @ToString.Exclude
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;
}
