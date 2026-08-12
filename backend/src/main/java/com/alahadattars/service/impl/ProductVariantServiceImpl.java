package com.alahadattars.service.impl;

import com.alahadattars.dto.variant.CreateVariantRequest;
import com.alahadattars.dto.variant.UpdateVariantRequest;
import com.alahadattars.dto.variant.VariantResponse;
import com.alahadattars.dto.variant.VariantSummaryResponse;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ConflictException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.mapper.ProductVariantMapper;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.service.ProductVariantService;
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
public class ProductVariantServiceImpl implements ProductVariantService {

    private final ProductVariantRepository productVariantRepository;
    private final ProductRepository productRepository;
    private final ProductVariantMapper productVariantMapper;

    @Override
    @Transactional
    public VariantResponse createVariant(Long productId, CreateVariantRequest request) {
        log.debug("Attempting to create variant for product ID: {}", productId);
        if (productVariantRepository.existsBySku(request.getSku())) {
            log.warn("Variant creation failed: SKU already exists '{}'", request.getSku());
            throw new ConflictException("Variant SKU already exists");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> {
                    log.warn("Variant creation failed: " + AppConstants.PRODUCT_NOT_FOUND_MSG + productId);
                    return new ResourceNotFoundException(AppConstants.PRODUCT_NOT_FOUND_MSG + productId);
                });

        ProductVariant variant = productVariantMapper.toEntity(request);
        validateVariantSize(product.getCategory().getType(), variant.getSize());
        product.addVariant(variant);
        
        ProductVariant savedVariant = productVariantRepository.save(variant);
        log.info("Variant Created: ID={}, SKU={}", savedVariant.getId(), savedVariant.getSku());

        return productVariantMapper.toResponse(savedVariant);
    }

    @Override
    @Transactional
    public VariantResponse updateVariant(Long id, UpdateVariantRequest request) {
        log.debug("Attempting to update variant with ID: {}", id);
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Variant update failed: " + AppConstants.VARIANT_NOT_FOUND_MSG + id);
                    return new ResourceNotFoundException(AppConstants.VARIANT_NOT_FOUND_MSG + id);
                });

        if (!variant.getSku().equals(request.getSku()) && productVariantRepository.existsBySku(request.getSku())) {
            log.warn("Variant update failed: SKU already exists '{}'", request.getSku());
            throw new ConflictException("Variant SKU already exists");
        }

        variant.setProductType(request.getProductType() != null ? request.getProductType() : variant.getProductType());
        variant.setSize(request.getSize());
        
        validateVariantSize(variant.getProduct().getCategory().getType(), variant.getSize());
        
        variant.setPrice(request.getPrice());
        variant.setSku(request.getSku());
        variant.setImage(request.getImage() != null ? request.getImage() : variant.getImage());

        ProductVariant updatedVariant = productVariantRepository.save(variant);
        log.info("Variant Updated: ID={}, SKU={}", updatedVariant.getId(), updatedVariant.getSku());
        return productVariantMapper.toResponse(updatedVariant);
    }

    @Override
    @Transactional
    public void deleteVariant(Long id) {
        log.debug("Attempting to delete variant with ID: {}", id);
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Variant delete failed: " + AppConstants.VARIANT_NOT_FOUND_MSG + id);
                    return new ResourceNotFoundException(AppConstants.VARIANT_NOT_FOUND_MSG + id);
                });

        variant.setActive(false);
        productVariantRepository.save(variant);
        
        
        log.info("Variant Deleted (Deactivated): ID={}", id);
    }

    @Override
    public VariantResponse getVariantById(Long id) {
        log.debug("Fetching variant with ID: {}", id);
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Variant fetch failed: " + AppConstants.VARIANT_NOT_FOUND_MSG + id);
                    return new ResourceNotFoundException(AppConstants.VARIANT_NOT_FOUND_MSG + id);
                });
        return productVariantMapper.toResponse(variant);
    }

    @Override
    public List<VariantSummaryResponse> getVariantsByProduct(Long productId) {
        log.debug("Fetching active variants for product ID: {}", productId);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> {
                    log.warn("Variants by product fetch failed: " + AppConstants.PRODUCT_NOT_FOUND_MSG + productId);
                    return new ResourceNotFoundException(AppConstants.PRODUCT_NOT_FOUND_MSG + productId);
                });
        
        return productVariantRepository.findByProduct(product).stream()
                .filter(ProductVariant::isActive)
                .map(productVariantMapper::toSummaryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void updateStock(Long id, Integer stock) {
        log.debug("Attempting to update stock for variant ID: {}", id);
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Variant stock update failed: " + AppConstants.VARIANT_NOT_FOUND_MSG + id);
                    return new ResourceNotFoundException(AppConstants.VARIANT_NOT_FOUND_MSG + id);
                });
        variant.setStock(stock);
        productVariantRepository.save(variant);
        log.info("Variant Stock Updated: ID={}, new stock={}", id, stock);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, Boolean active) {
        log.debug("Attempting to update status for variant ID: {}", id);
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Variant status update failed: " + AppConstants.VARIANT_NOT_FOUND_MSG + id);
                    return new ResourceNotFoundException(AppConstants.VARIANT_NOT_FOUND_MSG + id);
                });
        variant.setActive(active);
        productVariantRepository.save(variant);
        log.info("Variant Status Updated: ID={}, new status={}", id, active);
    }

    private void validateVariantSize(com.alahadattars.enums.CategoryType categoryType, String size) {
        if (size == null) {
            throw new BadRequestException("Variant size cannot be null");
        }
        String normalizedSize = size.toLowerCase().replace(" ", "");

        switch (categoryType) {
            case ATTARS:
                if (!List.of("3ml", "6ml", "12ml").contains(normalizedSize)) {
                    throw new BadRequestException("Invalid size for Attars. Allowed sizes: 3 ml, 6 ml, 12 ml");
                }
                break;
            case BAKHOOR:
                if (!List.of("40g").contains(normalizedSize)) {
                    throw new BadRequestException("Invalid size for Bakhoor. Allowed size: 40 g");
                }
                break;
            case PERFUMES:
                if (!List.of("30ml", "60ml", "100ml").contains(normalizedSize)) {
                    throw new BadRequestException("Invalid size for Perfumes. Allowed sizes: 30 ml, 60 ml, 100 ml");
                }
                break;
            default:
                break;
        }
    }
}
