package com.zerowaste.zerowaste.service;

import com.zerowaste.zerowaste.dto.NotificationResponse;
import com.zerowaste.zerowaste.exception.ApiException;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.repository.NotificationRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(
            NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public List<NotificationResponse> getForUser(Long userId) {

        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationResponse::from)
                .toList();
    }

    public long unreadCount(Long userId) {

        return notificationRepository
                .countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAllRead(Long userId) {

        List<Notification> unread
                = notificationRepository.findByUserIdAndReadFalse(userId);

        if (unread.isEmpty()) {
            return;
        }

        unread.forEach(notification
                -> notification.setRead(true)
        );

        notificationRepository.saveAll(unread);
    }

    @Transactional
    public NotificationResponse markRead(
            Long id,
            Long userId) {

        Notification notification
                = notificationRepository
                        .findByIdAndUserId(id, userId)
                        .orElseThrow(()
                                -> new ApiException(
                                "Notification not found.",
                                HttpStatus.NOT_FOUND
                        )
                        );

        notification.setRead(true);

        Notification saved
                = notificationRepository.save(notification);

        return NotificationResponse.from(saved);
    }
}
