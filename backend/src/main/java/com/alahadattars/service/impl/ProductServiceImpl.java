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
        product.setCategory(category);
        
        product.setSubcategory(request.getSubcategory());

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
    @Transactional(readOnly = true)
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
    @Transactional(readOnly = true)
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
    @Transactional(readOnly = true)
    public List<ProductSummaryResponse> getFeaturedProducts() {
        return productRepository.findByFeaturedTrueAndActiveTrue().stream()
                .map(productMapper::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductSummaryResponse> getProductsByCategory(Long categoryId) {
        log.debug("Fetching products for category ID: {}", categoryId);
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> {
                    log.warn("Products by category fetch failed: " + AppConstants.CATEGORY_NOT_FOUND_MSG + categoryId);
                    return new ResourceNotFoundException(AppConstants.CATEGORY_NOT_FOUND_MSG + categoryId);
                });
        String contextType = null;
        if (category.getName().equalsIgnoreCase("Perfumes")) {
            contextType = "PERFUME";
        } else if (category.getName().equalsIgnoreCase("Attars")) {
            contextType = "ATTAR";
        }
        final String finalContextType = contextType;

        return productRepository.findByCategoryAndActiveTrue(category).stream()
                .map(p -> productMapper.toSummaryResponse(p, finalContextType))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductSummaryResponse> getActiveProducts() {
        return productRepository.findByActiveTrue().stream()
                .map(productMapper::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductSummaryResponse> getProducts(String search, Long categoryId, String subcategory, Gender gender, String brand, Boolean featured, Boolean active, Boolean featuredInCollection, String type, Pageable pageable) {
        String categoryNameOpt = null;
        if (categoryId != null) {
            Category cat = categoryRepository.findById(categoryId).orElse(null);
            if (cat != null) {
                categoryNameOpt = cat.getName();
            }
        }
        final String categoryName = categoryNameOpt;

        Specification<Product> spec = (root, query, cb) -> {
            // category is a ManyToOne (to-one), safe to JOIN FETCH alongside pagination — unlike
            // variants/images (to-many, handled via @BatchSize instead), a to-one fetch join can't
            // multiply row count and break LIMIT/OFFSET. Skipped on the count query Spring Data
            // generates from this same Specification, where a fetch would be pointless and Hibernate
            // rejects it outside a root-entity-returning query anyway.
            if (Long.class != query.getResultType() && long.class != query.getResultType()) {
                root.fetch("category", jakarta.persistence.criteria.JoinType.LEFT);
            }
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.trim().isEmpty()) {
                String searchLower = search.trim().toLowerCase();
                String searchPattern = "%" + searchLower + "%";
                Predicate namePredicate = cb.like(cb.lower(root.get("name")), searchPattern);
                Predicate brandPredicate = cb.like(cb.lower(root.get("brand")), searchPattern);
                Predicate familyPredicate = cb.like(cb.lower(root.get("fragranceFamily")), searchPattern);
                Predicate categoryPredicate = cb.like(cb.lower(root.get("category").get("name")), searchPattern);
                Predicate subCategoryPredicate = cb.like(cb.lower(root.get("subcategory")), searchPattern);
                
                List<Predicate> orPredicates = new ArrayList<>();
                orPredicates.add(namePredicate);
                orPredicates.add(brandPredicate);
                orPredicates.add(familyPredicate);
                orPredicates.add(categoryPredicate);
                orPredicates.add(subCategoryPredicate);
                
                if (searchLower.contains("car perfume")) {
                    orPredicates.add(cb.equal(cb.lower(root.get("subcategory")), "fresheners"));
                }
                if (searchLower.contains("insence") || searchLower.contains("incense")) {
                    orPredicates.add(cb.equal(cb.lower(root.get("category").get("name")), "bakhoor"));
                }
                if (searchLower.contains("attar")) {
                    orPredicates.add(cb.equal(cb.lower(root.get("category").get("name")), "attars"));
                }
                if (searchLower.contains("perfume") && !searchLower.contains("car perfume")) {
                    orPredicates.add(cb.equal(cb.lower(root.get("category").get("name")), "perfumes"));
                }
                if (searchLower.contains("bakhoor")) {
                    orPredicates.add(cb.equal(cb.lower(root.get("category").get("name")), "bakhoor"));
                }

                predicates.add(cb.or(orPredicates.toArray(new Predicate[0])));
            }
            if (categoryId != null) {
                if (categoryName != null && "Perfumes".equalsIgnoreCase(categoryName)) {
                    jakarta.persistence.criteria.Join<Product, ProductVariant> variantJoin = root.join("variants", jakarta.persistence.criteria.JoinType.LEFT);
                    Predicate catMatch = cb.equal(root.get("category").get("id"), categoryId);
                    Predicate variantMatch = cb.equal(variantJoin.get("productType"), com.alahadattars.enums.ProductType.PERFUME);
                    query.distinct(true);
                    predicates.add(cb.or(catMatch, variantMatch));
                } else {
                    predicates.add(cb.equal(root.get("category").get("id"), categoryId));
                }
            }
            if (subcategory != null && !subcategory.trim().isEmpty()) {
                if (subcategory.equalsIgnoreCase("none")) {
                    predicates.add(cb.or(cb.isNull(root.get("subcategory")), cb.equal(root.get("subcategory"), "")));
                } else {
                    predicates.add(cb.equal(root.get("subcategory"), subcategory));
                }
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
            if (type != null && !type.trim().isEmpty()) {
                jakarta.persistence.criteria.Join<Product, ProductVariant> variantJoinTypeFilter = root.join("variants", jakarta.persistence.criteria.JoinType.INNER);
                try {
                    com.alahadattars.enums.ProductType pt = com.alahadattars.enums.ProductType.valueOf(type.toUpperCase());
                    predicates.add(cb.equal(variantJoinTypeFilter.get("productType"), pt));
                    query.distinct(true);
                } catch (IllegalArgumentException e) {
                    // Invalid type provided, ignore or log
                }
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        String contextType = type;
        if (contextType == null && categoryName != null) {
            if (categoryName.equalsIgnoreCase("Perfumes")) {
                contextType = "PERFUME";
            } else if (categoryName.equalsIgnoreCase("Attars")) {
                contextType = "ATTAR";
            }
        }
        final String finalContextType = contextType;

        return productRepository.findAll(spec, pageable).map(p -> productMapper.toSummaryResponse(p, finalContextType));
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
    @Transactional(readOnly = true)
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
