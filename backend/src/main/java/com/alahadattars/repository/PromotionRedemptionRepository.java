package com.alahadattars.repository;

import com.alahadattars.entity.PromotionRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PromotionRedemptionRepository extends JpaRepository<PromotionRedemption, Long> {

    long countByPromotionIdAndUserId(Long promotionId, Long userId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(r) FROM PromotionRedemption r LEFT JOIN r.user u WHERE r.promotion.id = :promotionId AND (u.email = :email OR r.guestEmail = :email)")
    long countByPromotionIdAndEmail(@org.springframework.data.repository.query.Param("promotionId") Long promotionId, @org.springframework.data.repository.query.Param("email") String email);
}
