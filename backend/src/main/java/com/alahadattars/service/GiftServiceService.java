package com.alahadattars.service;

import com.alahadattars.dto.gift.GiftServiceRequest;
import com.alahadattars.dto.gift.GiftServiceResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface GiftServiceService {

    GiftServiceResponse create(GiftServiceRequest request);

    GiftServiceResponse update(Long id, GiftServiceRequest request);

    void delete(Long id);

    GiftServiceResponse toggleActive(Long id);

    Page<GiftServiceResponse> getAll(String search, Pageable pageable);

    GiftServiceResponse getById(Long id);

    /** Storefront: only active services, sorted by sortOrder */
    List<GiftServiceResponse> getActiveServices();
}
