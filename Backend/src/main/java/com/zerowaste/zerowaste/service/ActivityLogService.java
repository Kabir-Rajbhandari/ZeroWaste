package com.zerowaste.zerowaste.service;

import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.model.FoodActivityLog;
import com.zerowaste.zerowaste.repository.FoodActivityLogRepository;

/**
 * Records what a specific user did — add / update / use / donate / waste /
 * remove / request — so the Recent Activity feed on their dashboard reflects
 * their own actions across the whole site, not just item usage/donation. Every
 * write here is tagged with the acting user's id, so one person's activity
 * never bleeds into another's feed.
 */
@Service
public class ActivityLogService {

    private final FoodActivityLogRepository activityLogRepository;

    public ActivityLogService(FoodActivityLogRepository activityLogRepository) {
        this.activityLogRepository = activityLogRepository;
    }

    public void record(Long userId, String type, String category, String itemName, Double quantity) {
        activityLogRepository.save(FoodActivityLog.builder()
                .userId(userId)
                .type(type)
                .category(category)
                .itemName(itemName)
                .quantity(quantity)
                .build());
    }
}
