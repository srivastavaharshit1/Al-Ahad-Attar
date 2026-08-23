package com.alahadattars.service.impl;

import com.alahadattars.dto.bottle.BottleRequest;
import com.alahadattars.dto.bottle.BottleResponse;
import com.alahadattars.entity.Bottle;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.BottleRepository;
import com.alahadattars.service.BottleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BottleServiceImpl implements BottleService {

    private final BottleRepository bottleRepository;

    @Override
    @Transactional(readOnly = true)
    public List<BottleResponse> getAllBottles() {
        return bottleRepository.findAll().stream()
                .map(BottleResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BottleResponse> getActiveBottles() {
        return bottleRepository.findByActiveTrue().stream()
                .map(BottleResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BottleResponse getBottleById(Long id) {
        return BottleResponse.fromEntity(getBottleEntityById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Bottle getBottleEntityById(Long id) {
        return bottleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bottle not found with id: " + id));
    }

    @Override
    @Transactional
    public BottleResponse createBottle(BottleRequest request) {
        Bottle bottle = Bottle.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .imageUrl(request.getImageUrl())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();
        return BottleResponse.fromEntity(bottleRepository.save(bottle));
    }

    @Override
    @Transactional
    public BottleResponse updateBottle(Long id, BottleRequest request) {
        Bottle bottle = getBottleEntityById(id);
        bottle.setName(request.getName());
        bottle.setDescription(request.getDescription());
        bottle.setPrice(request.getPrice());
        
        if (request.getImageUrl() != null) {
            bottle.setImageUrl(request.getImageUrl());
        }
        
        if (request.getActive() != null) {
            bottle.setActive(request.getActive());
        }

        return BottleResponse.fromEntity(bottleRepository.save(bottle));
    }

    @Override
    @Transactional
    public void deleteBottle(Long id) {
        Bottle bottle = getBottleEntityById(id);
        bottleRepository.delete(bottle);
    }
}
