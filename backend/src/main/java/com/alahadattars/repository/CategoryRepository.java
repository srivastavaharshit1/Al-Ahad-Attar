package com.alahadattars.repository;

import com.alahadattars.entity.Category;
import com.alahadattars.enums.CategoryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByName(String name);
    List<Category> findByType(CategoryType type);
    List<Category> findByActiveTrue();
    List<Category> findByActiveTrueAndShowOnHomepageTrueOrderByHomepageDisplayOrderAsc();
    boolean existsByName(String name);
    boolean existsByType(CategoryType type);
}
