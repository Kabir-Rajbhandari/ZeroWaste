package com.zerowaste.zerowaste.service;

import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.model.FoodActivityLog;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.repository.FoodActivityLogRepository;
import com.zerowaste.zerowaste.repository.NotificationRepository;

/**
 * Records what a specific user did — add / update / use / donate / waste /
 * remove / request / plan a meal — so the Recent Activity feed on their
 * dashboard reflects their own actions across the whole site, not just item
 * usage/donation. Every write here is tagged with the acting user's id, so
 * one person's activity never bleeds into another's feed.
 *
 * Every entry logged here is also mirrored into a simple, first-person
 * notification for that same user, so nothing on the Recent Activity feed
 * is missed by someone who only checks their Notifications.
 */
@Service
public class ActivityLogService {

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

        notifyOwnActivity(userId, type, itemName);
    }

    /**
     * Builds a short, plain-language notification describing the activity
     * that was just logged and saves it for the acting user. Kept
     * unread/unresolved-by-default like any other notification, so it
     * bumps the unread badge same as the rest.
     */
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
                title = "Donation Listed";
                message = "You put \"" + name + "\" up for donation.";
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