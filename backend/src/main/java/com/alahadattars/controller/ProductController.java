package com.alahadattars.controller;

import com.alahadattars.dto.product.ProductRequest;
import com.alahadattars.dto.product.ProductResponse;
import com.alahadattars.dto.product.ProductSummaryResponse;
import com.alahadattars.enums.Gender;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;

@Slf4j
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "Product Management", description = "APIs for managing products")
public class ProductController {

    private final ProductService productService;

    @Operation(summary = "Create a new product (ADMIN)")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Product created successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error")
    })
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @Valid @RequestBody ProductRequest request) {
        log.info("Received request to create new product: {}", request.getName());
        ProductResponse response = productService.createProduct(request);
        log.info("Successfully created product with ID: {}", response.getId());
        return ResponseEntity.ok(ApiResponse.<ProductResponse>builder()
                .success(true)
                .message("Product created successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Update an existing product (ADMIN)")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Product updated successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Product not found")
    })
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request) {
        log.info("Received request to update product with ID: {}", id);
        ProductResponse response = productService.updateProduct(id, request);
        log.info("Successfully updated product with ID: {}", id);
        return ResponseEntity.ok(ApiResponse.<ProductResponse>builder()
                .success(true)
                .message("Product updated successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Delete (deactivate) a product (ADMIN)")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Product deleted successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Product not found")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        log.info("Received request to delete product with ID: {}", id);
        productService.deleteProduct(id);
        log.info("Successfully deleted product with ID: {}", id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Product deleted successfully")
                .build());
    }

    @Operation(summary = "Activate a product (ADMIN)")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Product activated successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Product not found")
    })
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public ResponseEntity<ApiResponse<Void>> activateProduct(@PathVariable Long id) {
        log.info("Received request to activate product with ID: {}", id);
        productService.activateProduct(id);
        log.info("Successfully activated product with ID: {}", id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Product activated successfully")
                .build());
    }

    @Operation(summary = "Deactivate a product (ADMIN)")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Product deactivated successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Product not found")
    })
    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public ResponseEntity<ApiResponse<Void>> deactivateProduct(@PathVariable Long id) {
        log.info("Received request to deactivate product with ID: {}", id);
        productService.deactivateProduct(id);
        log.info("Successfully deactivated product with ID: {}", id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Product deactivated successfully")
                .build());
    }

    @Operation(summary = "Get a product by ID")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Product retrieved successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Product not found")
    })
    @GetMapping("/{id}")
    @Cacheable(value = "products", key = "'product_' + #id")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable Long id) {
        log.info("Received request to fetch product with ID: {}", id);
        ProductResponse response = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.<ProductResponse>builder()
                .success(true)
                .message("Product retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get a product by Slug")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Product retrieved successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Product not found")
    })
    @GetMapping("/slug/{slug}")
    @Cacheable(value = "products", key = "'slug_' + #slug")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductBySlug(@PathVariable String slug) {
        log.info("Received request to fetch product with slug: {}", slug);
        ProductResponse response = productService.getProductBySlug(slug);
        return ResponseEntity.ok(ApiResponse.<ProductResponse>builder()
                .success(true)
                .message("Product retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get featured products")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Featured products retrieved successfully")
    })
    @GetMapping("/featured")
    @Cacheable(value = "products", key = "'featured'")
    public ResponseEntity<ApiResponse<List<ProductSummaryResponse>>> getFeaturedProducts() {
        log.info("Received request to fetch featured products");
        List<ProductSummaryResponse> response = productService.getFeaturedProducts();
        return ResponseEntity.ok(ApiResponse.<List<ProductSummaryResponse>>builder()
                .success(true)
                .message("Featured products retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get products by Category ID")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Category products retrieved successfully")
    })
    @GetMapping("/category/{categoryId}")
    @Cacheable(value = "products", key = "'category_' + #categoryId")
    public ResponseEntity<ApiResponse<List<ProductSummaryResponse>>> getProductsByCategory(@PathVariable Long categoryId) {
        log.info("Received request to fetch products for category ID: {}", categoryId);
        List<ProductSummaryResponse> response = productService.getProductsByCategory(categoryId);
        return ResponseEntity.ok(ApiResponse.<List<ProductSummaryResponse>>builder()
                .success(true)
                .message("Category products retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Search and filter products with pagination")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Products retrieved successfully")
    })
    @GetMapping
    public ResponseEntity<ApiResponse<Page<ProductSummaryResponse>>> getProducts(
            @Parameter(description = "Search query for product name or description") @RequestParam(required = false) String search,
            @Parameter(description = "Filter by category ID") @RequestParam(required = false) Long categoryId,
            @Parameter(description = "Filter by subcategory string") @RequestParam(required = false) String subcategory,
            @Parameter(description = "Filter by gender") @RequestParam(required = false) Gender gender,
            @Parameter(description = "Filter by brand name") @RequestParam(required = false) String brand,
            @Parameter(description = "Filter by featured status") @RequestParam(required = false) Boolean featured,
            @Parameter(description = "Filter by active status") @RequestParam(required = false) Boolean active,
            @Parameter(description = "Filter by featured in collection status") @RequestParam(required = false) Boolean featuredInCollection,
            @Parameter(description = "Filter by product variant type") @RequestParam(required = false) String type,
            @Parameter(name = "sort", description = "Sorting criteria in the format: property,asc|desc.", example = "createdAt,desc")
            @PageableDefault(size = 10, page = 0, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        log.info("Received request to search/filter products with pageable: {}", pageable);
        Page<ProductSummaryResponse> response = productService.getProducts(search, categoryId, subcategory, gender, brand, featured, active, featuredInCollection, type, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<ProductSummaryResponse>>builder()
                .success(true)
                .message("Products retrieved successfully")
                .data(response)
                .build());
    }
    @Operation(summary = "Get related products for a product")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Related products retrieved successfully")
    })
    @GetMapping("/{id}/related")
    @Cacheable(value = "products", key = "'related_' + #id")
    public ResponseEntity<ApiResponse<List<ProductSummaryResponse>>> getRelatedProducts(@PathVariable Long id) {
        log.info("Received request to fetch related products for ID: {}", id);
        List<ProductSummaryResponse> response = productService.getRelatedProducts(id);
        return ResponseEntity.ok(ApiResponse.<List<ProductSummaryResponse>>builder()
                .success(true)
                .message("Related products retrieved successfully")
                .data(response)
                .build());
    }
}
