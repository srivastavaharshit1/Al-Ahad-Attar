package com.alahadattars.service;

import com.alahadattars.dto.notification.AdminNotificationResponse;
import com.alahadattars.dto.notification.AdminNotificationUnreadCountResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AdminNotificationService {
    Page<AdminNotificationResponse> getRecentNotifications(Pageable pageable);
    AdminNotificationUnreadCountResponse getUnreadCount();
    void markAsRead(Long id);
    void markAllAsRead();
}
