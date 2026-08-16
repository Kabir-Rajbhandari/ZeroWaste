package com.zerowaste.zerowaste.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.model.MealPlan;
import com.zerowaste.zerowaste.model.Notification;
import com.zerowaste.zerowaste.repository.MealPlanRepository;
import com.zerowaste.zerowaste.repository.NotificationRepository;

import jakarta.annotation.PostConstruct;

@Service
public class MealPlanReminderService {

    private final MealPlanRepository mealPlanRepository;
    private final NotificationRepository notificationRepository;

    public MealPlanReminderService(MealPlanRepository mealPlanRepository,
            NotificationRepository notificationRepository) {
        this.mealPlanRepository = mealPlanRepository;
        this.notificationRepository = notificationRepository;
    }

    @PostConstruct
    public void runOnStartup() {
        runMealReminderCheck();
    }

    @Scheduled(cron = "${app.meal-reminders.cron:0 0 18 * * *}")
    public void runMealReminderCheck() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        List<MealPlan> due = mealPlanRepository.findByMealDateAndReminderSentFalse(tomorrow);

        for (MealPlan plan : due) {
            if (plan.getName() == null || plan.getName().isBlank()) {
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
