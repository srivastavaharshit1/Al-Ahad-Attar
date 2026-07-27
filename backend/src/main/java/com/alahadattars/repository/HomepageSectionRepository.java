package com.alahadattars.repository;

import com.alahadattars.entity.HomepageSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HomepageSectionRepository extends JpaRepository<HomepageSection, Long> {
    Optional<HomepageSection> findBySectionKey(String sectionKey);
    List<HomepageSection> findAllByOrderByDisplayOrderAsc();
    List<HomepageSection> findByVisibleTrueOrderByDisplayOrderAsc();
}
