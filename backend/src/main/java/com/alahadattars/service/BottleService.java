package com.alahadattars.service;

import com.alahadattars.dto.bottle.BottleRequest;
import com.alahadattars.dto.bottle.BottleResponse;
import com.alahadattars.entity.Bottle;

import java.util.List;

public interface BottleService {
    List<BottleResponse> getAllBottles();
    List<BottleResponse> getActiveBottles();
    BottleResponse getBottleById(Long id);
    Bottle getBottleEntityById(Long id);
    BottleResponse createBottle(BottleRequest request);
    BottleResponse updateBottle(Long id, BottleRequest request);
    void deleteBottle(Long id);
}
