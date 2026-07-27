package com.alahadattars.repository;

import com.alahadattars.entity.WhyChooseUsItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WhyChooseUsItemRepository extends JpaRepository<WhyChooseUsItem, Long> {
    List<WhyChooseUsItem> findByActiveTrueOrderByDisplayOrderAsc();
    List<WhyChooseUsItem> findAllByOrderByDisplayOrderAsc();
}
