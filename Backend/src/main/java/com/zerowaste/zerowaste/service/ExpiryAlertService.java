package com.zerowaste.zerowaste.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.model.FoodItem;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.model.User;
import com.zerowaste.zerowaste.repository.FoodItemRepository;
import com.zerowaste.zerowaste.repository.NotificationRepository;
import com.zerowaste.zerowaste.repository.UserRepository;

import jakarta.annotation.PostConstruct;

/**
 * Scans food items daily and creates an "Alerts" notification for any item
 * that is:
 *  - not yet donated
 *  - not already alerted on (expiryAlertSent == false)
 *  - within app.expiry-alerts.days-before days of expiring, including
 *    "expires today"
 * for owners who have Expiry Alerts turned on in Settings. Each item is
 * only ever alerted on once (expiryAlertSent is flipped true afterward),
 * so re-running the scan never produces duplicates.
 */
@Service
public class ExpiryAlertService {

    private final FoodItemRepository foodItemRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Value("${app.expiry-alerts.days-before:7}")
    private int daysBefore;

    public ExpiryAlertService(FoodItemRepository foodItemRepository,
                               NotificationRepository notificationRepository,
                               UserRepository userRepository) {
        this.foodItemRepository = foodItemRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    // Also run once at application startup, so the alert doesn't sit idle
    // until the next scheduled cron tick (useful for local dev/testing too).
    @PostConstruct
    public void runOnStartup() {
        runExpiryAlertCheck();
    }

    @Scheduled(cron = "${app.expiry-alerts.cron:0 0 8 * * *}")
    public void runExpiryAlertCheck() {
        LocalDate today = LocalDate.now();
        LocalDate cutoff = today.plusDays(daysBefore);

        List<FoodItem> candidates =
                foodItemRepository.findByDonatedFalseAndExpiryAlertSentFalseAndExpiryDateBetween(today, cutoff);

        for (FoodItem item : candidates) {
            Optional<User> ownerOpt = userRepository.findById(item.getUserId());
            if (ownerOpt.isEmpty()) {
                continue;
            }
            User owner = ownerOpt.get();

            // Respect the user's Expiry Alerts toggle in Settings.
            if (!Boolean.TRUE.equals(owner.getExpiryAlertsEnabled())) {
                continue;
            }

            long daysLeft = ChronoUnit.DAYS.between(today, item.getExpiryDate());
            String message = buildMessage(item, daysLeft);

            Notification notification = Notification.builder()
                    .userId(owner.getId())
                    .type("EXPIRY_ALERT")
                    .category("Alerts")
                    .title("Food Item Expiring Soon")
                    .message(message)
                    .read(false)
                    .resolved(true) // not an actionable notification, no accept/decline buttons
                    .build();
            notificationRepository.save(notification);

            item.setExpiryAlertSent(true);
            foodItemRepository.save(item);
        }
    }

    private String buildMessage(FoodItem item, long daysLeft) {
        if (daysLeft <= 0) {
            return item.getName() + " expires today. Use it or donate it before it goes to waste!";
        }
        String dayWord = daysLeft == 1 ? "day" : "days";
        return item.getName() + " will expire in " + daysLeft + " " + dayWord
                + " (" + item.getExpiryDate() + "). Use it soon to avoid waste!";
    }
}