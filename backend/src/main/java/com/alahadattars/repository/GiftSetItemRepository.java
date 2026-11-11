package com.alahadattars.repository;

import com.alahadattars.entity.GiftSet;
import com.alahadattars.entity.GiftSetItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GiftSetItemRepository extends JpaRepository<GiftSetItem, Long> {

    List<GiftSetItem> findByGiftSetOrderByDisplayOrderAsc(GiftSet giftSet);

    void deleteByGiftSet(GiftSet giftSet);

    boolean existsByVariantId(Long variantId);

    boolean existsByProductId(Long productId);
}

