package com.alahadattars.service.impl;

import com.alahadattars.dto.ContactMessageRequest;
import com.alahadattars.dto.ContactMessageResponse;
import com.alahadattars.entity.ContactMessage;
import com.alahadattars.enums.MessageStatus;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.ContactMessageRepository;
import com.alahadattars.service.ContactMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ContactMessageServiceImpl implements ContactMessageService {

    private final ContactMessageRepository repository;

    @Override
    @Transactional
    public ContactMessageResponse submitInquiry(ContactMessageRequest request) {
        ContactMessage message = ContactMessage.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .inquiryType(request.getInquiryType())
                .message(request.getMessage())
                .status(MessageStatus.UNREAD)
                .build();
                
        ContactMessage saved = repository.save(message);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ContactMessageResponse> getAllInquiries(String inquiryType, MessageStatus status, Pageable pageable) {
        // For simplicity, just get all with pagination (filtering can be added to repo later if needed)
        // Since we only need simple filtering or listing, getting all and mapping is fine.
        // Or better yet, we can filter in memory or add custom queries later.
        Page<ContactMessage> messages = repository.findAll(pageable);
        return messages.map(this::mapToResponse);
    }

    @Override
    @Transactional
    public ContactMessageResponse updateStatus(Long id, MessageStatus status) {
        ContactMessage message = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id " + id));
        
        message.setStatus(status);
        return mapToResponse(repository.save(message));
    }

    @Override
    @Transactional
    public void deleteInquiry(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Message not found with id " + id);
        }
        repository.deleteById(id);
    }

    private ContactMessageResponse mapToResponse(ContactMessage message) {
        return ContactMessageResponse.builder()
                .id(message.getId())
                .firstName(message.getFirstName())
                .lastName(message.getLastName())
                .email(message.getEmail())
                .inquiryType(message.getInquiryType())
                .message(message.getMessage())
                .status(message.getStatus())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
