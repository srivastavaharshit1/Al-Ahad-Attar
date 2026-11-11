package com.alahadattars.repository;

import com.alahadattars.entity.GiftSet;
import com.alahadattars.entity.GiftSetImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GiftSetImageRepository extends JpaRepository<GiftSetImage, Long> {

    List<GiftSetImage> findByGiftSetAndActiveTrueOrderByDisplayOrderAsc(GiftSet giftSet);

    Optional<GiftSetImage> findByGiftSetAndIsPrimaryTrueAndActiveTrue(GiftSet giftSet);

    int countByGiftSetAndActiveTrue(GiftSet giftSet);

    @Modifying
    @Query("UPDATE GiftSetImage gsi SET gsi.isPrimary = false WHERE gsi.giftSet = :giftSet")
    void resetPrimaryForGiftSet(@Param("giftSet") GiftSet giftSet);
}

