package com.alahadattars.controller;

import com.alahadattars.dto.admin.CustomerListResponse;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/admin/customers")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Customers", description = "APIs for managing customers from admin panel")
public class AdminCustomerController {

    private final OrderRepository orderRepository;

    @Operation(summary = "Get list of all customers with aggregated stats")
    @GetMapping
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<CustomerListResponse>>> getCustomers(
            @org.springframework.web.bind.annotation.RequestParam(required = false) String search,
            @org.springframework.data.web.PageableDefault(size = 10, page = 0, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) 
            org.springframework.data.domain.Pageable pageable) {
        log.info("Fetching all customers for admin dashboard with search: {}", search);
        org.springframework.data.domain.Page<CustomerListResponse> customers = orderRepository.getCustomerList(search, pageable);
        
        return ResponseEntity.ok(ApiResponse.<org.springframework.data.domain.Page<CustomerListResponse>>builder()
                .success(true)
                .message("Customers retrieved successfully")
                .data(customers)
                .build());
    }
}
