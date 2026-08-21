package com.alahadattars.service.impl;

import com.alahadattars.dto.notification.AdminNotificationResponse;
import com.alahadattars.dto.notification.AdminNotificationUnreadCountResponse;
import com.alahadattars.entity.AdminNotification;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.AdminNotificationRepository;
import com.alahadattars.service.AdminNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminNotificationServiceImpl implements AdminNotificationService {

    private final AdminNotificationRepository adminNotificationRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<AdminNotificationResponse> getRecentNotifications(Pageable pageable) {
        return adminNotificationRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminNotificationUnreadCountResponse getUnreadCount() {
        return AdminNotificationUnreadCountResponse.builder()
                .unreadCount(adminNotificationRepository.countByIsReadFalse())
                .build();
    }

    @Override
    @Transactional
    public void markAsRead(Long id) {
        AdminNotification notification = adminNotificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));
        notification.setRead(true);
        adminNotificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void markAllAsRead() {
        adminNotificationRepository.markAllAsRead();
    }

    private AdminNotificationResponse mapToResponse(AdminNotification notification) {
        return AdminNotificationResponse.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .type(notification.getType())
                .orderId(notification.getOrderId())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
