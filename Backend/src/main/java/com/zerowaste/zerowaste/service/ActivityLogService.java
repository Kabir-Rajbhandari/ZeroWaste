package com.zerowaste.zerowaste.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.model.FoodActivityLog;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.repository.FoodActivityLogRepository;
import com.zerowaste.zerowaste.repository.NotificationRepository;

@Service
public class ActivityLogService {

    private static final Logger log = LoggerFactory.getLogger(ActivityLogService.class);

    private final FoodActivityLogRepository activityLogRepository;
    private final NotificationRepository notificationRepository;

    public ActivityLogService(FoodActivityLogRepository activityLogRepository,
            NotificationRepository notificationRepository) {
        this.activityLogRepository = activityLogRepository;
        this.notificationRepository = notificationRepository;
    }

    public void record(Long userId, String type, String category, String itemName, Double quantity) {
        activityLogRepository.save(FoodActivityLog.builder()
                .userId(userId)
                .type(type)
                .category(category)
                .itemName(itemName)
                .quantity(quantity)
                .build());

        try {
            notifyOwnActivity(userId, type, itemName);
        } catch (RuntimeException ex) {
            log.warn("Could not create activity notification for user {} and type {}", userId, type, ex);
        }
    }

    private void notifyOwnActivity(Long userId, String type, String itemName) {
        String name = (itemName == null || itemName.isBlank()) ? "an item" : itemName;

        String title;
        String message;
        String notifCategory;

        switch (type) {
            case "ADDED":
                title = "Item Added";
                message = "You added \"" + name + "\" to your inventory.";
                notifCategory = "System";
                break;
            case "UPDATED":
                title = "Item Updated";
                message = "You updated \"" + name + "\".";
                notifCategory = "System";
                break;
            case "USED":
                title = "Item Used";
                message = "You marked \"" + name + "\" as used.";
                notifCategory = "System";
                break;
            case "DONATED":
                title = "Donation Completed";
                message = "You donated \"" + name + "\". It's now visible to others in Browse Food Item.";
                notifCategory = "Donations";
                break;
            case "WASTED":
                title = "Item Expired";
                message = "\"" + name + "\" expired and was marked as wasted.";
                notifCategory = "System";
                break;
            case "REMOVED":
                title = "Item Removed";
                message = "You removed \"" + name + "\" from your inventory.";
                notifCategory = "System";
                break;
            case "REQUESTED":
                title = "Claim Requested";
                message = "You requested to claim \"" + name + "\".";
                notifCategory = "Donations";
                break;
            case "MEAL_PLANNED":
                title = "Meal Planned";
                message = "You planned a meal: " + name + ".";
                notifCategory = "Reminders";
                break;
            case "LISTED_FOR_DONATION":
                title = "Listed for Donation";
                message = "You listed \"" + name + "\" for donation. Finish it from your Donation Listing.";
                notifCategory = "Donations";
                break;
            case "REVERTED_TO_INVENTORY":
                title = "Moved Back to Inventory";
                message = "You moved \"" + name + "\" back to your Food Inventory.";
                notifCategory = "System";
                break;
            default:
                title = "Activity";
                message = type + " \"" + name + "\".";
                notifCategory = "System";
                break;
        }

        notificationRepository.save(Notification.builder()
                .userId(userId)
                .type("ACTIVITY_" + type)
                .category(notifCategory)
                .title(title)
                .message(message)
                .read(false)
                .resolved(true)
                .itemName(itemName)
                .build());
    }
}
