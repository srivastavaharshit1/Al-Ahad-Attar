package com.alahadattars.repository;

import com.alahadattars.entity.PromoBanner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PromoBannerRepository extends JpaRepository<PromoBanner, Long> {

    @Query("SELECT p FROM PromoBanner p WHERE p.active = true " +
           "AND (p.startDate IS NULL OR p.startDate <= :now) " +
           "AND (p.endDate IS NULL OR p.endDate >= :now) " +
           "ORDER BY p.priority ASC")
    List<PromoBanner> findActiveAndValidBanners(@Param("now") LocalDateTime now);
    
    List<PromoBanner> findAllByOrderByPriorityAsc();
}
