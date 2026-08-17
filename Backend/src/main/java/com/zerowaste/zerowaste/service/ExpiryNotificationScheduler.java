package com.zerowaste.zerowaste.service;

import com.zerowaste.zerowaste.model.FoodItem;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.model.User;
import com.zerowaste.zerowaste.repository.FoodItemRepository;
import com.zerowaste.zerowaste.repository.NotificationRepository;
import com.zerowaste.zerowaste.repository.UserRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ExpiryNotificationScheduler {

    private static final String EXPIRY_ALERT_TYPE = "EXPIRY_ALERT";

    private static final String CATEGORY = "Alerts";

    private static final int NOTIFICATION_DAYS_BEFORE_EXPIRY = 3;

    private final FoodItemRepository foodItemRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public ExpiryNotificationScheduler(
            FoodItemRepository foodItemRepository,
            NotificationRepository notificationRepository,
            UserRepository userRepository) {

        this.foodItemRepository = foodItemRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    /**
     * Runs every day at 6:00 AM UTC.
     *
     * Notification rules:
     *
     * 4+ days remaining -> no notification 3 days remaining -> notification 2
     * days remaining -> notification 1 day remaining -> notification 0 days
     * remaining -> notification expired -> no new notification
     */
    @Scheduled(
            cron = "${app.expiry-alerts.cron:0 0 6 * * *}",
            zone = "UTC"
    )
    @Transactional
    public void generateDailyExpiryNotifications() {

        /*
         * Use UTC because the notification scheduler is defined
         * as a universal 6:00 AM scheduler.
         */
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        LocalDate notificationCutoff
                = today.plusDays(NOTIFICATION_DAYS_BEFORE_EXPIRY);

        /*
         * Get active food items expiring between today and
         * three days from today.
         *
         * This automatically excludes:
         *
         * - food expiring in 4+ days
         * - already expired food
         * - donated food
         */
        List<FoodItem> expiringItems
                = foodItemRepository.findByDonatedFalseAndExpiryDateBetween(
                        today,
                        notificationCutoff
                );

        if (expiringItems.isEmpty()) {
            return;
        }

        /*
         * Collect unique user IDs so that users can be loaded
         * in one database query rather than querying once per item.
         */
        Set<Long> userIds = expiringItems.stream()
                .filter(Objects::nonNull)
                .map(FoodItem::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (userIds.isEmpty()) {
            return;
        }

        Map<Long, User> usersById
                = userRepository.findAllById(userIds)
                        .stream()
                        .filter(Objects::nonNull)
                        .collect(Collectors.toMap(
                                User::getId,
                                Function.identity()
                        ));

        for (FoodItem item : expiringItems) {

            if (item == null
                    || item.getId() == null
                    || item.getUserId() == null
                    || item.getExpiryDate() == null) {
                continue;
            }

            /*
             * Safety check in case the item was donated after the
             * repository query.
             */
            if (Boolean.TRUE.equals(item.getDonated())) {
                continue;
            }

            User user = usersById.get(item.getUserId());

            if (user == null) {
                continue;
            }

            /*
             * Master notification switch.
             */
            if (!Boolean.TRUE.equals(user.getNotificationsEnabled())) {
                continue;
            }

            /*
             * Expiry notification-specific switch.
             */
            if (!Boolean.TRUE.equals(user.getExpiryAlertsEnabled())) {
                continue;
            }

            long daysRemaining = ChronoUnit.DAYS.between(
                    today,
                    item.getExpiryDate()
            );

            /*
             * Only 0, 1, 2 and 3 days remaining are valid.
             */
            if (daysRemaining < 0
                    || daysRemaining > NOTIFICATION_DAYS_BEFORE_EXPIRY) {
                continue;
            }

            /*
             * Prevent duplicate notifications for the same item
             * on the same day.
             *
             * Example:
             *
             * Milk expires on 20 Aug.
             *
             * 17 Aug -> 3 days -> notification
             * 18 Aug -> 2 days -> notification
             * 19 Aug -> 1 day  -> notification
             * 20 Aug -> 0 days -> notification
             *
             * But running the scheduler twice on 17 Aug still
             * creates only ONE notification.
             */
            boolean alreadySent
                    = notificationRepository
                            .existsByUserIdAndTypeAndFoodItemIdAndExpiryAlertDate(
                                    user.getId(),
                                    EXPIRY_ALERT_TYPE,
                                    item.getId(),
                                    today
                            );

            if (alreadySent) {
                continue;
            }

            Notification notification = Notification.builder()
                    .userId(user.getId())
                    .type(EXPIRY_ALERT_TYPE)
                    .category(CATEGORY)
                    .title(buildTitle(daysRemaining))
                    .message(buildMessage(
                            item.getName(),
                            item.getExpiryDate(),
                            daysRemaining
                    ))
                    .read(false)
                    .resolved(true)
                    .itemName(item.getName())
                    .foodItemId(item.getId())
                    .expiryAlertDate(today)
                    .build();

            try {
                notificationRepository.save(notification);
            } catch (DataIntegrityViolationException ignored) {
                /*
                 * The unique database constraint protects against
                 * simultaneous scheduler executions.
                 *
                 * If another execution inserted the same notification
                 * first, there is nothing else to do.
                 */
            }
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

    private String buildMessage(
            String itemName,
            LocalDate expiryDate,
            long daysRemaining) {

        if (daysRemaining == 0) {
            return "\"" + itemName
                    + "\" expires today. "
                    + "Please use or donate it to help reduce food waste.";
        }

        if (daysRemaining == 1) {
            return "\"" + itemName
                    + "\" expires tomorrow (" + expiryDate + "). "
                    + "Please use or donate it to help reduce food waste.";
        }

        return "\"" + itemName
                + "\" expires in " + daysRemaining
                + " days (" + expiryDate + "). "
                + "Please use or donate it before it expires.";
    }
}
