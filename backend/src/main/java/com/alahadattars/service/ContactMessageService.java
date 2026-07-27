package com.alahadattars.service;

import com.alahadattars.dto.ContactMessageRequest;
import com.alahadattars.dto.ContactMessageResponse;
import com.alahadattars.enums.MessageStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ContactMessageService {
    ContactMessageResponse submitInquiry(ContactMessageRequest request);
    Page<ContactMessageResponse> getAllInquiries(String inquiryType, MessageStatus status, Pageable pageable);
    ContactMessageResponse updateStatus(Long id, MessageStatus status);
    void deleteInquiry(Long id);
}
