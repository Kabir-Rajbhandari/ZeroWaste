package com.zerowaste.zerowaste.service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zerowaste.zerowaste.model.FoodItem;
import com.zerowaste.zerowaste.model.User;
import com.zerowaste.zerowaste.repository.FoodItemRepository;
import com.zerowaste.zerowaste.repository.UserRepository;

@Service
public class ExpiryNotificationScheduler {

    private static final int NOTIFICATION_DAYS_BEFORE_EXPIRY = 3;

    private final FoodItemRepository foodItemRepository;
    private final UserRepository userRepository;
    private final ExpiryAlertService expiryAlertService;

    public ExpiryNotificationScheduler(
            FoodItemRepository foodItemRepository,
            UserRepository userRepository,
            ExpiryAlertService expiryAlertService) {

        this.foodItemRepository = foodItemRepository;
        this.userRepository = userRepository;
        this.expiryAlertService = expiryAlertService;
    }

    /**
     * Runs every day at 6:00 AM UTC.
     *
     * Notification rules (delegated to {@link ExpiryAlertService}):
     *
     * 4+ days remaining -> no notification 3 days remaining -> notification 2
     * days remaining -> notification 1 day remaining -> notification 0 days
     * remaining -> notification expired -> no new notification
     *
     * This is a nightly sweep of every item already sitting in someone's
     * inventory. Items that are 0-3 days from expiring the moment they're
     * *added* get their first alert immediately instead — see
     * {@link FoodItemService#create}, which calls the same
     * {@link ExpiryAlertService#generateIfDue} — so nobody has to wait until
     * the next morning's run just because they added an
     * already-close-to-expiring item today.
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

            if (item == null || item.getUserId() == null) {
                continue;
            }

            User user = usersById.get(item.getUserId());

            expiryAlertService.generateIfDue(item, user, today);
        }
    }
}
