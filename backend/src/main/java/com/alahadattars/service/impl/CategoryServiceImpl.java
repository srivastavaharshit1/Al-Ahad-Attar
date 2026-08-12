package com.alahadattars.service.impl;

import com.alahadattars.dto.category.CategoryRequest;
import com.alahadattars.dto.category.CategoryResponse;
import com.alahadattars.entity.Category;
import com.alahadattars.exception.ConflictException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.mapper.CategoryMapper;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.service.CategoryService;
import com.alahadattars.service.StorageService;
import com.alahadattars.util.AppConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final CategoryMapper categoryMapper;
    private final StorageService storageService;

    @Override
    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        log.debug("Attempting to create category: {}", request.getName());
        if (categoryRepository.existsByName(request.getName())) {
            log.warn("Category creation failed: Name already exists '{}'", request.getName());
            throw new ConflictException("Category name already exists");
        }

        List<Category> sameTypeCategories = categoryRepository.findByType(request.getType());
        if (!sameTypeCategories.isEmpty()) {
            log.warn("Category creation failed: Type '{}' already exists", request.getType());
            throw new ConflictException("Category type already exists");
        }

        Category category = categoryMapper.toEntity(request);
        Category savedCategory = categoryRepository.save(category);

        log.info("Category Created: ID={}, Name={}", savedCategory.getId(), savedCategory.getName());
        return categoryMapper.toResponse(savedCategory);
    }

    @Override
    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        log.debug("Attempting to update category with ID: {}", id);
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Category update failed: " + AppConstants.CATEGORY_NOT_FOUND_MSG + id);
                    return new ResourceNotFoundException(AppConstants.CATEGORY_NOT_FOUND_MSG + id);
                });

        if (!category.getName().equals(request.getName()) && categoryRepository.existsByName(request.getName())) {
            log.warn("Category update failed: Name already exists '{}'", request.getName());
            throw new ConflictException("Category name already exists");
        }

        if (category.getType() != request.getType()) {
            List<Category> sameTypeCategories = categoryRepository.findByType(request.getType());
            if (!sameTypeCategories.isEmpty()) {
                log.warn("Category update failed: Type '{}' already exists", request.getType());
                throw new ConflictException("Category type already exists");
            }
        }

        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setImage(request.getImage());
        category.setType(request.getType());
        category.setActive(request.isActive());
        category.setHomepageTitle(request.getHomepageTitle());
        category.setHomepageSubtitle(request.getHomepageSubtitle());
        category.setHomepageButtonText(request.getHomepageButtonText());
        category.setHomepageButtonUrl(request.getHomepageButtonUrl());
        category.setShowOnHomepage(request.isShowOnHomepage());
        category.setHomepageDisplayOrder(request.getHomepageDisplayOrder());

        Category updatedCategory = categoryRepository.save(category);
        log.info("Category Updated: ID={}, Name={}", updatedCategory.getId(), updatedCategory.getName());
        
        return categoryMapper.toResponse(updatedCategory);
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        log.debug("Attempting to delete category with ID: {}", id);
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Category delete failed: " + AppConstants.CATEGORY_NOT_FOUND_MSG + id);
                    return new ResourceNotFoundException(AppConstants.CATEGORY_NOT_FOUND_MSG + id);
                });

        if (!productRepository.findByCategory(category).isEmpty()) {
            log.warn("Category delete failed: Contains products. ID={}", id);
            throw new ConflictException("Cannot delete Category because it contains products.");
        }

        category.setActive(false);
        categoryRepository.save(category);
        log.info("Category Deleted (Deactivated): ID={}", id);
    }

    @Override
    public CategoryResponse getCategoryById(Long id) {
        log.debug("Fetching category with ID: {}", id);
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Category fetch failed: " + AppConstants.CATEGORY_NOT_FOUND_MSG + id);
                    return new ResourceNotFoundException(AppConstants.CATEGORY_NOT_FOUND_MSG + id);
                });
        return categoryMapper.toResponse(category);
    }

    @Override
    public org.springframework.data.domain.Page<CategoryResponse> getAllCategories(org.springframework.data.domain.Pageable pageable) {
        log.debug("Fetching all categories with pagination");
        return categoryRepository.findAll(pageable)
                .map(categoryMapper::toResponse);
    }

    @Override
    public List<CategoryResponse> getActiveCategories() {
        log.debug("Fetching active categories");
        return categoryRepository.findByActiveTrue().stream()
                .map(categoryMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CategoryResponse uploadDesktopImage(Long id, org.springframework.web.multipart.MultipartFile file) {
        log.debug("Uploading desktop image for category ID: {}", id);
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(AppConstants.CATEGORY_NOT_FOUND_MSG + id));

        String fileUrl = storageService.uploadFile(file, "categories/" + id);
        category.setDesktopImageUrl(fileUrl);
        category = categoryRepository.save(category);
        log.info("Desktop image uploaded successfully for category ID: {}", id);
        return categoryMapper.toResponse(category);
    }

    @Override
    @Transactional
    public CategoryResponse uploadMobileImage(Long id, org.springframework.web.multipart.MultipartFile file) {
        log.debug("Uploading mobile image for category ID: {}", id);
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(AppConstants.CATEGORY_NOT_FOUND_MSG + id));

        String fileUrl = storageService.uploadFile(file, "categories/" + id);
        category.setMobileImageUrl(fileUrl);
        category = categoryRepository.save(category);
        log.info("Mobile image uploaded successfully for category ID: {}", id);
        return categoryMapper.toResponse(category);
    }

    @Override
    @Transactional
    public CategoryResponse uploadHoverImage(Long id, org.springframework.web.multipart.MultipartFile file) {
        log.debug("Uploading hover image for category ID: {}", id);
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(AppConstants.CATEGORY_NOT_FOUND_MSG + id));

        String fileUrl = storageService.uploadFile(file, "categories/" + id);
        category.setHoverImageUrl(fileUrl);
        category = categoryRepository.save(category);
        log.info("Hover image uploaded successfully for category ID: {}", id);
        return categoryMapper.toResponse(category);
    }
}
