package com.alahadattars.service.impl;

import com.alahadattars.dto.product.ProductImageResponse;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductImage;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.mapper.ProductImageMapper;
import com.alahadattars.repository.ProductImageRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.service.ProductImageService;
import com.alahadattars.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductImageServiceImpl implements ProductImageService {

    private final ProductImageRepository productImageRepository;
    private final ProductRepository productRepository;
    private final ProductImageMapper productImageMapper;
    private final StorageService storageService;

    @Override
    @Transactional
    public ProductImageResponse uploadImage(Long productId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        int currentCount = productImageRepository.countByProductAndActiveTrue(product);
        if (currentCount >= 10) {
            throw new BadRequestException("Maximum 10 images allowed per product");
        }

        try {
            String storedPath = storageService.uploadFile(file, "products/" + productId);

            String originalFilename = file.getOriginalFilename();
            String format = "jpeg";
            if (originalFilename != null && originalFilename.contains(".")) {
                format = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
            }

            ProductImage productImage = ProductImage.builder()
                    .product(product)
                    .imageUrl(storedPath)
                    .format(format)
                    .displayOrder(currentCount)
                    .isPrimary(currentCount == 0)
                    .active(true)
                    .build();

            product.addImage(productImage);
            ProductImage savedImage = productImageRepository.save(productImage);

            log.info("Uploaded image for product {}: {}", productId, storedPath);
            return productImageMapper.toResponse(savedImage);
            
        } catch (Exception e) {
            log.error("Failed to upload product image: {}", e.getMessage());
            throw new BadRequestException("Failed to upload image: " + e.getMessage());
        }
    }

    @Override
    public List<ProductImageResponse> getImagesByProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        return productImageRepository.findByProductAndActiveTrueOrderByDisplayOrderAsc(product)
                .stream()
                .map(productImageMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteImage(Long imageId) {
        ProductImage image = productImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found with ID: " + imageId));
        
        // Remove from db (soft delete)
        image.setActive(false);
        productImageRepository.save(image);
        
        // Remove physical file
        try {
            storageService.deleteFile(image.getImageUrl());
        } catch (Exception e) {
            log.warn("Could not delete physical file for image {}: {}", imageId, e.getMessage());
        }
        
        // Ensure exactly one primary image exists if there are any active images left
        Product product = image.getProduct();
        List<ProductImage> remaining = productImageRepository.findByProductAndActiveTrueOrderByDisplayOrderAsc(product);
        if (!remaining.isEmpty()) {
            boolean hasPrimary = remaining.stream().anyMatch(ProductImage::isPrimary);
            if (!hasPrimary) {
                ProductImage newPrimary = remaining.get(0);
                newPrimary.setPrimary(true);
                productImageRepository.save(newPrimary);
            }
        }
        
        log.info("Deleted image ID: {}", imageId);
    }

    @Override
    @Transactional
    public List<ProductImageResponse> updateDisplayOrder(Long productId, List<Long> orderedImageIds) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        List<ProductImage> images = productImageRepository.findByProductAndActiveTrueOrderByDisplayOrderAsc(product);
        
        for (int i = 0; i < orderedImageIds.size(); i++) {
            Long targetId = orderedImageIds.get(i);
            for (ProductImage img : images) {
                if (img.getId().equals(targetId)) {
                    img.setDisplayOrder(i);
                    break;
                }
            }
        }
        
        productImageRepository.saveAll(images);
        
        return images.stream()
                .sorted((a, b) -> Integer.compare(a.getDisplayOrder(), b.getDisplayOrder()))
                .map(productImageMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ProductImageResponse setPrimaryImage(Long imageId) {
        ProductImage newPrimary = productImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found with ID: " + imageId));
                
        if (!newPrimary.isActive()) {
            throw new BadRequestException("Cannot set inactive image as primary");
        }

        Product product = newPrimary.getProduct();
        
        List<ProductImage> oldPrimaries = productImageRepository.findByProductAndIsPrimaryAndActiveTrue(product, true);
        for (ProductImage oldPrimary : oldPrimaries) {
            if (!oldPrimary.getId().equals(newPrimary.getId())) {
                oldPrimary.setPrimary(false);
            }
        }
        productImageRepository.saveAll(oldPrimaries);

        newPrimary.setPrimary(true);
        ProductImage savedImage = productImageRepository.save(newPrimary);
        
        return productImageMapper.toResponse(savedImage);
    }

    @Override
    @Transactional
    public ProductImageResponse updateAltText(Long imageId, String altText) {
        ProductImage image = productImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found with ID: " + imageId));

        if (!image.isActive()) {
            throw new BadRequestException("Cannot update inactive image");
        }

        image.setAltText(altText);
        ProductImage savedImage = productImageRepository.save(image);
        return productImageMapper.toResponse(savedImage);
    }
}
