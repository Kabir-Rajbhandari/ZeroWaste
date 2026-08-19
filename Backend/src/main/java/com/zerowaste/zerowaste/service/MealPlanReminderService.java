package com.zerowaste.zerowaste.service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.model.MealPlan;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.model.User;
import com.zerowaste.zerowaste.repository.MealPlanRepository;
import com.zerowaste.zerowaste.repository.NotificationRepository;
import com.zerowaste.zerowaste.repository.UserRepository;

import jakarta.annotation.PostConstruct;

@Service
public class MealPlanReminderService {

    private final MealPlanRepository mealPlanRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public MealPlanReminderService(MealPlanRepository mealPlanRepository,
            NotificationRepository notificationRepository,
            UserRepository userRepository) {
        this.mealPlanRepository = mealPlanRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    /**
     * Also run once on startup (mirrors {@link ExpiryNotificationScheduler
     * #runOnStartup}) so a restart/deploy doesn't leave "tomorrow's" meal
     * reminders sitting unsent until the next day-rollover run.
     */
    @PostConstruct
    public void runOnStartup() {
        runMealReminderCheck();
    }

    /**
     * Runs every day at 00:01 UTC — the same universal day-rollover trigger as
     * {@link ExpiryNotificationScheduler}, not a fixed local-clock hour like
     * the old 6:00 PM cron. The moment the calendar date advances, "tomorrow"
     * shifts too, so this sweep re-evaluates every meal plan immediately rather
     * than waiting for a specific hour to arrive. The zone is pinned to UTC
     * (not the server's local/default zone) so the behavior is identical no
     * matter where the backend happens to be deployed.
     */
    @Scheduled(
            cron = "${app.meal-reminders.cron:0 1 0 * * *}",
            zone = "UTC"
    )
    public void runMealReminderCheck() {
        // Use UTC here too, so "tomorrow" lines up with the same UTC
        // calendar day the cron trigger just rolled into.
        LocalDate tomorrow = LocalDate.now(ZoneOffset.UTC).plusDays(1);
        List<MealPlan> due = mealPlanRepository.findByMealDateAndReminderSentFalse(tomorrow);

        if (due.isEmpty()) {
            return;
        }

        Set<Long> userIds = due.stream().map(MealPlan::getUserId).collect(Collectors.toSet());
        Map<Long, User> usersById = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        for (MealPlan plan : due) {
            if (plan.getName() == null || plan.getName().isBlank()) {
                plan.setReminderSent(true);
                mealPlanRepository.save(plan);
                continue;
            }

            // Same preference check as expiry alerts — a user who's turned
            // notifications off shouldn't still get pinged for meal prep.
            User user = usersById.get(plan.getUserId());
            if (user == null || !Boolean.TRUE.equals(user.getNotificationsEnabled())) {
                plan.setReminderSent(true);
                mealPlanRepository.save(plan);
                continue;
            }

            Notification notification = Notification.builder()
                    .userId(plan.getUserId())
                    .type("MEAL_PLAN_REMINDER")
                    .category("Reminders")
                    .title("Meal Planned for Tomorrow")
                    .message(plan.getMealType() + " tomorrow: " + plan.getName() + ". Don't forget to prep your ingredients!")
                    .read(false)
                    .resolved(true)
                    .build();
            notificationRepository.save(notification);

            plan.setReminderSent(true);
            mealPlanRepository.save(plan);
        }
    }
}
