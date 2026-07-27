package com.alahadattars.repository;

import com.alahadattars.entity.Promotion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, Long> {

    Optional<Promotion> findByCode(String code);
    
    @Query("SELECT p FROM Promotion p WHERE p.active = true " +
           "AND (p.startDate IS NULL OR p.startDate <= :now) " +
           "AND (p.endDate IS NULL OR p.endDate >= :now) " +
           "AND p.code IS NULL " +
           "ORDER BY p.priority DESC")
    List<Promotion> findActiveAutomaticPromotions(@Param("now") LocalDateTime now);
    
    @Query("SELECT p FROM Promotion p WHERE p.active = true " +
           "AND (p.startDate IS NULL OR p.startDate <= :now) " +
           "AND (p.endDate IS NULL OR p.endDate >= :now) " +
           "AND UPPER(p.code) = UPPER(:code)")
    Optional<Promotion> findActivePromotionByCode(@Param("code") String code, @Param("now") LocalDateTime now);
    
    Page<Promotion> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @Query("SELECT p FROM Promotion p WHERE p.active = true " +
           "AND (p.startDate IS NULL OR p.startDate <= :now) " +
           "AND (p.endDate IS NULL OR p.endDate >= :now) " +
           "ORDER BY p.priority DESC")
    List<Promotion> findAllActivePromotions(@Param("now") LocalDateTime now);
}
