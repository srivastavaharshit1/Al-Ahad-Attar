package com.alahadattars.repository;

import com.alahadattars.entity.HomepageProductSlot;
import com.alahadattars.enums.HomepageProductSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface HomepageProductSlotRepository extends JpaRepository<HomepageProductSlot, Long> {

    /** All slots for a section, ordered by display_order ascending, eager-loading the product. */
    @Query("SELECT s FROM HomepageProductSlot s JOIN FETCH s.product p WHERE s.section = :section ORDER BY s.displayOrder ASC")
    List<HomepageProductSlot> findBySectionOrderByDisplayOrderAsc(@Param("section") HomepageProductSection section);

    /**
     * All enabled slots for a section, used by the customer-facing endpoint.
     * Joins to product so we can check active state and avoid a second round-trip.
     */
    @Query("SELECT s FROM HomepageProductSlot s JOIN FETCH s.product p WHERE s.section = :section AND s.enabled = true AND p.active = true ORDER BY s.displayOrder ASC")
    List<HomepageProductSlot> findEnabledBySectionOrderByDisplayOrderAsc(@Param("section") HomepageProductSection section);

    /** Check whether a product is already slotted in a section (for duplicate guard). */
    boolean existsBySectionAndProductId(@Param("section") HomepageProductSection section, @Param("productId") Long productId);

    /** Used when a product is deleted to cascade-clean orphaned slots. */
    void deleteByProductId(Long productId);

    Optional<HomepageProductSlot> findBySectionAndProductId(HomepageProductSection section, Long productId);
}
