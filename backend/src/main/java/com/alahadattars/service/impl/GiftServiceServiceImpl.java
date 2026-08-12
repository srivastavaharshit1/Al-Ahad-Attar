package com.alahadattars.service.impl;

import com.alahadattars.dto.gift.GiftServiceRequest;
import com.alahadattars.dto.gift.GiftServiceResponse;
import com.alahadattars.entity.GiftService;
import com.alahadattars.exception.ConflictException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.GiftServiceRepository;
import com.alahadattars.service.GiftServiceService;
import com.alahadattars.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GiftServiceServiceImpl implements GiftServiceService {

    private final GiftServiceRepository giftServiceRepository;
    private final StorageService storageService;

    @Override
    @Transactional
    public GiftServiceResponse create(GiftServiceRequest request) {
        // Validate no duplicate name
        giftServiceRepository.findByNameIgnoreCase(request.getName()).ifPresent(existing -> {
            throw new ConflictException("A gift service with name '" + request.getName() + "' already exists.");
        });

        GiftService entity = GiftService.builder()
                .name(request.getName())
                .description(request.getDescription())
                .imageUrl(request.getImageUrl())
                .price(request.getPrice())
                .active(request.isActive())
                .sortOrder(request.getSortOrder())
                .build();

        return mapToResponse(giftServiceRepository.save(entity));
    }

    @Override
    @Transactional
    public GiftServiceResponse update(Long id, GiftServiceRequest request) {
        GiftService entity = giftServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gift service not found: " + id));

        // Validate no duplicate name (excluding self)
        giftServiceRepository.findByNameIgnoreCase(request.getName()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new ConflictException("A gift service with name '" + request.getName() + "' already exists.");
            }
        });

        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setImageUrl(request.getImageUrl());
        entity.setPrice(request.getPrice());
        entity.setActive(request.isActive());
        entity.setSortOrder(request.getSortOrder());

        return mapToResponse(giftServiceRepository.save(entity));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        GiftService entity = giftServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gift service not found: " + id));
        giftServiceRepository.delete(entity);
    }

    @Override
    @Transactional
    public GiftServiceResponse toggleActive(Long id) {
        GiftService entity = giftServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gift service not found: " + id));
        entity.setActive(!entity.isActive());
        return mapToResponse(giftServiceRepository.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<GiftServiceResponse> getAll(String search, Pageable pageable) {
        return giftServiceRepository.searchGiftServices(search, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public GiftServiceResponse getById(Long id) {
        return giftServiceRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Gift service not found: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<GiftServiceResponse> getActiveServices() {
        return giftServiceRepository.findAllByActiveTrueOrderBySortOrderAsc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private GiftServiceResponse mapToResponse(GiftService entity) {
        String formattedImageUrl = storageService.resolveUrl(
                entity.getImageUrl(), "/api/gift-services/" + entity.getId() + "/image");

        return GiftServiceResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .imageUrl(formattedImageUrl)
                .price(entity.getPrice())
                .active(entity.isActive())
                .sortOrder(entity.getSortOrder())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
