package com.zerowaste.zerowaste.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zerowaste.zerowaste.dto.NotificationResponse;
import com.zerowaste.zerowaste.exception.ApiException;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.repository.NotificationRepository;

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

    /**
     * Removes a single notification for good. Scoped to its owner so this can
     * never delete someone else's notification even if the id is guessed.
     *
     * A pending donation claim request (unresolved, with a claimRequestId)
     * can't be deleted directly — it still needs an Accept or Decline, and
     * deleting the notification would strand that request with no way to act on
     * it. The person needs to resolve it first.
     */
    @Transactional
    public void delete(Long id, Long userId) {

        Notification notification = notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException(
                "Notification not found.",
                HttpStatus.NOT_FOUND
        ));

        if (notification.getClaimRequestId() != null && !Boolean.TRUE.equals(notification.getResolved())) {
            throw new ApiException(
                    "Please accept or decline this request before removing it.",
                    HttpStatus.BAD_REQUEST
            );
        }

        notificationRepository.delete(notification);
    }
}
