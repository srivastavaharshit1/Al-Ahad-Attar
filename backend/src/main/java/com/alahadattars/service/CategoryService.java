package com.alahadattars.service;

import com.alahadattars.dto.category.CategoryRequest;
import com.alahadattars.dto.category.CategoryResponse;

import java.util.List;

public interface CategoryService {
    CategoryResponse createCategory(CategoryRequest request);
    CategoryResponse updateCategory(Long id, CategoryRequest request);
    void deleteCategory(Long id);
    CategoryResponse getCategoryById(Long id);
    List<CategoryResponse> getActiveCategories();
    CategoryResponse uploadDesktopImage(Long id, org.springframework.web.multipart.MultipartFile file);
    CategoryResponse uploadMobileImage(Long id, org.springframework.web.multipart.MultipartFile file);
    CategoryResponse uploadHoverImage(Long id, org.springframework.web.multipart.MultipartFile file);
    org.springframework.data.domain.Page<CategoryResponse> getAllCategories(org.springframework.data.domain.Pageable pageable);
}
