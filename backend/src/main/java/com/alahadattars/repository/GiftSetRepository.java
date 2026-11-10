package com.alahadattars.repository;

import com.alahadattars.entity.GiftSet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GiftSetRepository extends JpaRepository<GiftSet, Long> {

    Optional<GiftSet> findBySlugAndActiveTrue(String slug);

    Optional<GiftSet> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    List<GiftSet> findByActiveTrueOrderByDisplayOrderAsc();

    List<GiftSet> findByFeaturedTrueAndActiveTrueOrderByDisplayOrderAsc();

    Page<GiftSet> findByActive(boolean active, Pageable pageable);

    @Query("SELECT g FROM GiftSet g LEFT JOIN FETCH g.items i LEFT JOIN FETCH i.variant v LEFT JOIN FETCH i.product p WHERE g.slug = :slug AND g.active = true")
    Optional<GiftSet> findBySlugWithItemsEager(@Param("slug") String slug);

    @Query("SELECT g FROM GiftSet g LEFT JOIN FETCH g.items i LEFT JOIN FETCH i.variant v LEFT JOIN FETCH i.product p WHERE g.id = :id")
    Optional<GiftSet> findByIdWithItemsEager(@Param("id") Long id);

    @Query("SELECT DISTINCT g FROM GiftSet g LEFT JOIN FETCH g.items i LEFT JOIN FETCH i.variant v LEFT JOIN FETCH i.product p WHERE g.id IN :ids")
    List<GiftSet> findAllByIdWithItemsEager(@Param("ids") java.util.Collection<Long> ids);
}

