package com.zerowaste.zerowaste.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zerowaste.zerowaste.model.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Notification> findByUserIdAndReadFalse(Long userId);

    long countByUserIdAndReadFalse(Long userId);

    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    Optional<Notification> findFirstByClaimRequestId(Long claimRequestId);

    /**
     * Checks whether this particular food item already generated an expiry
     * notification for this user on this date.
     *
     * This allows the same item to notify once per day:
     */
    boolean existsByUserIdAndTypeAndFoodItemIdAndExpiryAlertDate(
            Long userId,
            String type,
            Long foodItemId,
            java.time.LocalDate expiryAlertDate
    );
}
