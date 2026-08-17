package com.zerowaste.zerowaste.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(
        name = "notifications",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_notification_expiry_alert",
                    columnNames = {
                        "user_id",
                        "type",
                        "food_item_id",
                        "expiry_alert_date"
                    }
            )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * User who receives the notification.
     */
    @Column(nullable = false)
    private Long userId;

    /**
     * Notification type.
     *
     * Examples: DONATION_REQUEST DONATION_ACCEPTED DONATION_DECLINED
     * NEW_DONATION EXPIRY_ALERT
     */
    @Column(nullable = false)
    private String type;

    /**
     * Notification category.
     *
     * Examples: Alerts Donations Reminders System
     */
    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Builder.Default
    @Column(nullable = false)
    private Boolean read = false;

    /**
     * Used by donation request notifications.
     */
    private Long claimRequestId;

    /**
     * Snapshot of requester name at notification creation time.
     */
    private String requesterName;

    /**
     * Snapshot of food item name at notification creation time.
     */
    private String itemName;

    /**
     * Food item that generated the notification.
     *
     * Used by expiry notifications. Other notification types may leave this
     * null.
     */
    @Column(name = "food_item_id")
    private Long foodItemId;

    /**
     * Calendar date on which this expiry notification was generated.
     *
     * Used together with userId + type + foodItemId to prevent duplicate expiry
     * notifications on the same day.
     */
    @Column(name = "expiry_alert_date")
    private LocalDate expiryAlertDate;

    /**
     * Whether the notification has been resolved.
     *
     * Expiry notifications are informational, so they are immediately
     * considered resolved.
     */
    @Builder.Default
    @Column(nullable = false)
    private Boolean resolved = false;

    @Column(nullable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
