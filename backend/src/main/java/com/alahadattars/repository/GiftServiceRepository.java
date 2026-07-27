package com.alahadattars.repository;

import com.alahadattars.entity.GiftService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GiftServiceRepository extends JpaRepository<GiftService, Long> {

    /** For storefront: only active services, sorted by sort_order ASC */
    List<GiftService> findAllByActiveTrueOrderBySortOrderAsc();

    /** For duplicate name validation */
    Optional<GiftService> findByNameIgnoreCase(String name);

    /** Admin search + pageable */
    @Query("SELECT g FROM GiftService g WHERE :search IS NULL OR :search = '' " +
           "OR LOWER(g.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(g.description) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<GiftService> searchGiftServices(@Param("search") String search, Pageable pageable);
}
