package com.zerowaste.zerowaste.dto;

import com.zerowaste.zerowaste.model.Notification;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@AllArgsConstructor
public class NotificationResponse {

    private Long id;

    private String type;

    private String category;

    private String title;

    private String message;

    private Boolean read;

    private Boolean resolved;

    private Long claimRequestId;

    private String requesterName;

    private String itemName;

    private Long foodItemId;

    private LocalDate expiryAlertDate;

    private Instant createdAt;

    public static NotificationResponse from(Notification notification) {

        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getCategory(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getRead(),
                notification.getResolved(),
                notification.getClaimRequestId(),
                notification.getRequesterName(),
                notification.getItemName(),
                notification.getFoodItemId(),
                notification.getExpiryAlertDate(),
                notification.getCreatedAt()
        );
    }
}
