package com.alahadattars.service.impl;

import com.alahadattars.dto.product.ProductRequest;
import com.alahadattars.dto.product.ProductResponse;
import com.alahadattars.dto.product.ProductSummaryResponse;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.exception.ConflictException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.mapper.ProductMapper;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.service.ProductService;
import com.alahadattars.util.AppConstants;
import com.alahadattars.enums.Gender;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductMapper productMapper;

    @Override
    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        log.debug("Attempting to create product with slug: {}", request.getSlug());
        if (productRepository.existsBySlug(request.getSlug())) {
            log.warn("Product creation failed: Slug already exists '{}'", request.getSlug());
            throw new ConflictException("Product slug already exists");
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> {
                    log.warn("Product creation failed: " + AppConstants.CATEGORY_NOT_FOUND_MSG + request.getCategoryId());
                    return new ResourceNotFoundException(AppConstants.CATEGORY_NOT_FOUND_MSG + request.getCategoryId());
                });

        Product product = productMapper.toEntity(request);
        category.addProduct(product);
        
        Product savedProduct = productRepository.save(product);
        log.info("Product Created: ID={}, Slug={}", savedProduct.getId(), savedProduct.getSlug());

        return productMapper.toResponse(savedProduct);
    }

    @Override
    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        log.debug("Attempting to update product with ID: {}", id);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Product update failed: " + AppConstants.PRODUCT_NOT_FOUND_MSG + id);
                    return new ResourceNotFoundException(AppConstants.PRODUCT_NOT_FOUND_MSG + id);
                });

        if (!product.getSlug().equals(request.getSlug()) && productRepository.existsBySlug(request.getSlug())) {
            log.warn("Product update failed: Slug already exists '{}'", request.getSlug());
            throw new ConflictException("Product slug already exists");
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> {
                    log.warn("Product update failed: " + AppConstants.CATEGORY_NOT_FOUND_MSG + request.getCategoryId());
                    return new ResourceNotFoundException(AppConstants.CATEGORY_NOT_FOUND_MSG + request.getCategoryId());
                });

        if (!product.getCategory().getId().equals(category.getId())) {
            product.getCategory().removeProduct(product);
            category.addProduct(product);
        }

        product.setName(request.getName());
        product.setSlug(request.getSlug());
        product.setShortDescription(request.getShortDescription());
        product.setDescription(request.getDescription());
        product.setBrand(request.getBrand());
        product.setSubcategory(request.getSubcategory());
        product.setFragranceFamily(request.getFragranceFamily());
        product.setTopNotes(request.getTopNotes());
        product.setMiddleNotes(request.getMiddleNotes());
        product.setBaseNotes(request.getBaseNotes());
        product.setLongevity(request.getLongevity());
        product.setProjection(request.getProjection());
        product.setGender(request.getGender());
        product.setFeatured(request.isFeatured());
        product.setActive(request.isActive());
        
        if (request.isFeaturedInCollection()) {
            product.getCollections().add("COLLECTIONS");
        } else {
            product.getCollections().remove("COLLECTIONS");
        }

        Product updatedProduct = productRepository.save(product);
        log.info("Product Updated: ID={}, Slug={}", updatedProduct.getId(), updatedProduct.getSlug());

        return productMapper.toResponse(updatedProduct);
    }

    @Override
    @Transactional
    public void deleteProduct(Long id) {
        log.debug("Attempting to delete product with ID: {}", id);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Product delete failed: " + AppConstants.PRODUCT_NOT_FOUND_MSG + id);
                    return new ResourceNotFoundException(AppConstants.PRODUCT_NOT_FOUND_MSG + id);
                });

        product.setActive(false);
        productRepository.save(product);
        log.info("Product Deleted (Deactivated): ID={}", id);

        List<ProductVariant> variants = productVariantRepository.findByProduct(product);
        for (ProductVariant variant : variants) {
            variant.setActive(false);
            productVariantRepository.save(variant);
            log.info("Variant Deleted (Deactivated): ID={} cascading from Product", variant.getId());
        }
    }

    @Override
    public ProductResponse getProductById(Long id) {
        log.debug("Fetching product with ID: {}", id);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Product fetch failed: " + AppConstants.PRODUCT_NOT_FOUND_MSG + id);
                    return new ResourceNotFoundException(AppConstants.PRODUCT_NOT_FOUND_MSG + id);
                });
        return productMapper.toResponse(product);
    }

    @Override
    public ProductResponse getProductBySlug(String slug) {
        log.debug("Fetching product with slug: {}", slug);
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> {
                    log.warn("Product fetch failed: Product not found with Slug: " + slug);
                    return new ResourceNotFoundException("Product not found with Slug: " + slug);
                });
        return productMapper.toResponse(product);
    }

    @Override
    public List<ProductSummaryResponse> getFeaturedProducts() {
        return productRepository.findByFeaturedTrue().stream()
                .map(productMapper::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProductSummaryResponse> getProductsByCategory(Long categoryId) {
        log.debug("Fetching products for category ID: {}", categoryId);
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> {
                    log.warn("Products by category fetch failed: " + AppConstants.CATEGORY_NOT_FOUND_MSG + categoryId);
                    return new ResourceNotFoundException(AppConstants.CATEGORY_NOT_FOUND_MSG + categoryId);
                });
        return productRepository.findByCategory(category).stream()
                .map(productMapper::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProductSummaryResponse> getActiveProducts() {
        return productRepository.findByActiveTrue().stream()
                .map(productMapper::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    public Page<ProductSummaryResponse> getProducts(String search, Long categoryId, String subcategory, Gender gender, String brand, Boolean featured, Boolean active, Boolean featuredInCollection, Pageable pageable) {
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.trim().isEmpty()) {
                String searchPattern = "%" + search.trim().toLowerCase() + "%";
                Predicate namePredicate = cb.like(cb.lower(root.get("name")), searchPattern);
                Predicate brandPredicate = cb.like(cb.lower(root.get("brand")), searchPattern);
                Predicate familyPredicate = cb.like(cb.lower(root.get("fragranceFamily")), searchPattern);
                predicates.add(cb.or(namePredicate, brandPredicate, familyPredicate));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (subcategory != null && !subcategory.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("subcategory"), subcategory));
            }
            if (gender != null) {
                predicates.add(cb.equal(root.get("gender"), gender));
            }
            if (brand != null && !brand.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("brand"), brand));
            }
            if (featured != null) {
                predicates.add(cb.equal(root.get("featured"), featured));
            }
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (featuredInCollection != null && featuredInCollection) {
                predicates.add(cb.isMember("COLLECTIONS", root.get("collections")));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return productRepository.findAll(spec, pageable).map(productMapper::toSummaryResponse);
    }

    @Override
    @Transactional
    public void activateProduct(Long id) {
        log.debug("Attempting to activate product with ID: {}", id);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Product activation failed: " + AppConstants.PRODUCT_NOT_FOUND_MSG + id);
                    return new ResourceNotFoundException(AppConstants.PRODUCT_NOT_FOUND_MSG + id);
                });
        product.setActive(true);
        productRepository.save(product);
        log.info("Product Activated: ID={}", id);
    }

    @Override
    @Transactional
    public void deactivateProduct(Long id) {
        deleteProduct(id);
    }

    @Override
    public List<ProductSummaryResponse> getRelatedProducts(Long id) {
        log.debug("Fetching related products for product ID: {}", id);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(AppConstants.PRODUCT_NOT_FOUND_MSG + id));

        int targetCount = 6;
        List<Product> relatedProducts = new ArrayList<>();
        org.springframework.data.domain.PageRequest limit = org.springframework.data.domain.PageRequest.of(0, targetCount);

        // 1. Same Category
        List<Product> byCategory = productRepository.findByCategoryAndIdNotAndActiveTrue(product.getCategory(), id, limit).getContent();
        relatedProducts.addAll(byCategory);

        // 2. Similar Fragrance Family
        if (relatedProducts.size() < targetCount && product.getFragranceFamily() != null) {
            limit = org.springframework.data.domain.PageRequest.of(0, targetCount - relatedProducts.size());
            List<Product> byFamily = productRepository.findByFragranceFamilyAndIdNotAndActiveTrue(product.getFragranceFamily(), id, limit).getContent();
            for (Product p : byFamily) {
                if (!relatedProducts.contains(p)) {
                    relatedProducts.add(p);
                }
            }
        }

        // 3. Top Rated / Fallback
        if (relatedProducts.size() < targetCount) {
            limit = org.springframework.data.domain.PageRequest.of(0, targetCount); // fetch more in case of overlap
            List<Product> topRated = productRepository.findTopRatedProducts(id, limit).getContent();
            for (Product p : topRated) {
                if (relatedProducts.size() >= targetCount) break;
                if (!relatedProducts.contains(p)) {
                    relatedProducts.add(p);
                }
            }
        }

        return relatedProducts.stream()
                .map(productMapper::toSummaryResponse)
                .collect(Collectors.toList());
    }
}
