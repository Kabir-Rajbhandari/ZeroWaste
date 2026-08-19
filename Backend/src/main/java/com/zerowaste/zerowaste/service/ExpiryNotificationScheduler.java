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

import jakarta.annotation.PostConstruct;

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

    @PostConstruct
    public void runOnStartup() {
        generateDailyExpiryNotifications();
    }

    @Scheduled(
            cron = "${app.expiry-alerts.cron:0 1 0 * * *}",
            zone = "UTC"
    )
    @Transactional
    public void generateDailyExpiryNotifications() {

        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        LocalDate notificationCutoff
                = today.plusDays(NOTIFICATION_DAYS_BEFORE_EXPIRY);

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
