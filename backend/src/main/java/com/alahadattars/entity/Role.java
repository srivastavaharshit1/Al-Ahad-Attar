package com.alahadattars.entity;

import com.alahadattars.enums.RoleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a user role in the system.
 * Used for authorization and access control.
 */
@Entity
@Table(
    name = "role",
    indexes = {
        @Index(name = "idx_role_name", columnList = "name")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class Role extends BaseEntity {

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(length = 50, nullable = false, unique = true)
    private RoleType name;

    @NotBlank
    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    // No cascade/orphanRemoval here deliberately: Role is a fixed lookup table (USER/ADMIN) and must
    // never own User's lifecycle. User.role (the owning side, via @JoinColumn) is what persists the
    // association; cascading from here would mean deleting a Role cascade-deletes every user with it,
    // and previously forced a full table load of every user on each new registration for no benefit.
    @ToString.Exclude
    @OneToMany(mappedBy = "role", fetch = FetchType.LAZY)
    @Builder.Default
    private List<User> users = new ArrayList<>();

    /**
     * Helper method to add a user and synchronize the bidirectional relationship.
     * @param user The user to add
     */
    public void addUser(User user) {
        users.add(user);
        user.setRole(this);
    }

    /**
     * Helper method to remove a user and synchronize the bidirectional relationship.
     * @param user The user to remove
     */
    public void removeUser(User user) {
        users.remove(user);
        user.setRole(null);
    }
}
