package com.alahadattars.repository;

import com.alahadattars.entity.PromotionRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PromotionRedemptionRepository extends JpaRepository<PromotionRedemption, Long> {

    long countByPromotionIdAndUserId(Long promotionId, Long userId);
}
