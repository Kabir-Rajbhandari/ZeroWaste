package com.zerowaste.zerowaste.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zerowaste.zerowaste.model.FoodItem;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.model.User;
import com.zerowaste.zerowaste.repository.NotificationRepository;

@Service
public class ExpiryAlertService {

    public static final String EXPIRY_ALERT_TYPE = "EXPIRY_ALERT";

    private static final String CATEGORY = "Alerts";

    private static final int NOTIFICATION_DAYS_BEFORE_EXPIRY = 3;

    private final NotificationRepository notificationRepository;

    public ExpiryAlertService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void generateIfDue(FoodItem item, User user, LocalDate today) {
        if (item == null || item.getId() == null || item.getExpiryDate() == null) {
            return;
        }
        if (Boolean.TRUE.equals(item.getDonated())) {
            return;
        }
        if (user == null || user.getId() == null) {
            return;
        }
        if (!Boolean.TRUE.equals(user.getNotificationsEnabled())) {
            return;
        }
        if (!Boolean.TRUE.equals(user.getExpiryAlertsEnabled())) {
            return;
        }

        long daysRemaining = ChronoUnit.DAYS.between(today, item.getExpiryDate());

        if (daysRemaining < 0 || daysRemaining > NOTIFICATION_DAYS_BEFORE_EXPIRY) {
            return;
        }

        boolean alreadySent = notificationRepository.existsByUserIdAndTypeAndFoodItemIdAndExpiryAlertDate(
                user.getId(), EXPIRY_ALERT_TYPE, item.getId(), today);

        if (alreadySent) {
            return;
        }

        Notification notification = Notification.builder()
                .userId(user.getId())
                .type(EXPIRY_ALERT_TYPE)
                .category(CATEGORY)
                .title(buildTitle(daysRemaining))
                .message(buildMessage(item.getName(), item.getExpiryDate(), daysRemaining))
                .read(false)
                .resolved(true)
                .itemName(item.getName())
                .foodItemId(item.getId())
                .expiryAlertDate(today)
                .build();

        try {
            notificationRepository.save(notification);
        } catch (DataIntegrityViolationException ignored) {
            // Another concurrent call (e.g. the scheduler firing at the same
            // moment as an add) already inserted this exact alert — the
            // unique constraint on (userId, type, foodItemId,
            // expiryAlertDate) protects against a duplicate row.
        }
    }

    private String buildTitle(long daysRemaining) {
        if (daysRemaining == 0) {
            return "Food Expires Today";
        }
        if (daysRemaining == 1) {
            return "Food Expires Tomorrow";
        }
        return "Food Expiry Reminder";
    }

    private String buildMessage(String itemName, LocalDate expiryDate, long daysRemaining) {
        if (daysRemaining == 0) {
            return "\"" + itemName + "\" expires today. "
                    + "Please use or donate it to help reduce food waste.";
        }
        if (daysRemaining == 1) {
            return "\"" + itemName + "\" expires tomorrow (" + expiryDate + "). "
                    + "Please use or donate it to help reduce food waste.";
        }
        return "\"" + itemName + "\" expires in " + daysRemaining + " days (" + expiryDate + "). "
                + "Please use or donate it before it expires.";
    }
}
