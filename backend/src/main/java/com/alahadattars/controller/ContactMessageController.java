package com.alahadattars.controller;

import com.alahadattars.response.ApiResponse;
import com.alahadattars.dto.ContactMessageRequest;
import com.alahadattars.dto.ContactMessageResponse;
import com.alahadattars.enums.MessageStatus;
import com.alahadattars.service.ContactMessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ContactMessageController {

    private final ContactMessageService contactMessageService;

    @PostMapping("/contact/submit")
    public ResponseEntity<ApiResponse<ContactMessageResponse>> submitInquiry(@Valid @RequestBody ContactMessageRequest request) {
        ContactMessageResponse response = contactMessageService.submitInquiry(request);
        return ResponseEntity.ok(ApiResponse.<ContactMessageResponse>builder()
                .success(true)
                .message("Inquiry submitted successfully")
                .data(response)
                .build());
    }

    @GetMapping("/admin/contact")
    public ResponseEntity<ApiResponse<Page<ContactMessageResponse>>> getAllInquiries(
            @RequestParam(required = false) String inquiryType,
            @RequestParam(required = false) MessageStatus status,
            Pageable pageable) {
        Page<ContactMessageResponse> messages = contactMessageService.getAllInquiries(inquiryType, status, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<ContactMessageResponse>>builder()
                .success(true)
                .message("Inquiries fetched successfully")
                .data(messages)
                .build());
    }

    @PutMapping("/admin/contact/{id}/status")
    public ResponseEntity<ApiResponse<ContactMessageResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam MessageStatus status) {
        ContactMessageResponse updated = contactMessageService.updateStatus(id, status);
        return ResponseEntity.ok(ApiResponse.<ContactMessageResponse>builder()
                .success(true)
                .message("Inquiry status updated successfully")
                .data(updated)
                .build());
    }

    @DeleteMapping("/admin/contact/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteInquiry(@PathVariable Long id) {
        contactMessageService.deleteInquiry(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Inquiry deleted successfully")
                .build());
    }
}
