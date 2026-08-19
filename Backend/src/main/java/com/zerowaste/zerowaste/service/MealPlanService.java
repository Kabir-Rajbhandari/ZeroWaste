package com.zerowaste.zerowaste.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.dto.MealPlanRequest;
import com.zerowaste.zerowaste.dto.MealPlanResponse;
import com.zerowaste.zerowaste.exception.ApiException;
import com.zerowaste.zerowaste.model.FoodItem;
import com.zerowaste.zerowaste.model.MealPlan;
import com.zerowaste.zerowaste.repository.FoodItemRepository;
import com.zerowaste.zerowaste.repository.MealPlanRepository;

@Service
public class MealPlanService {

    private static final Set<String> ALLOWED_MEAL_TYPES = Set.of("Breakfast", "Lunch", "Dinner", "Snacks");

    private final MealPlanRepository mealPlanRepository;
    private final FoodItemRepository foodItemRepository;
    private final ActivityLogService activityLogService;

    public MealPlanService(MealPlanRepository mealPlanRepository,
            FoodItemRepository foodItemRepository,
            ActivityLogService activityLogService) {
        this.mealPlanRepository = mealPlanRepository;
        this.foodItemRepository = foodItemRepository;
        this.activityLogService = activityLogService;
    }

    public List<MealPlanResponse> getForRange(Long userId, LocalDate start, LocalDate end) {
        if (start == null || end == null || end.isBefore(start)) {
            throw new ApiException("Invalid date range.", HttpStatus.BAD_REQUEST);
        }

        List<MealPlan> plans = mealPlanRepository.findByUserIdAndMealDateBetweenOrderByMealDateAsc(userId, start, end);
        if (plans.isEmpty()) {
            return List.of();
        }

        Set<Long> linkedIds = plans.stream()
                .map(MealPlan::getLinkedFoodItemId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, FoodItem> itemsById = foodItemRepository.findAllById(linkedIds).stream()
                .collect(Collectors.toMap(FoodItem::getId, i -> i));

        return plans.stream()
                .map(plan -> MealPlanResponse.from(plan, resolveLinkedName(plan, itemsById)))
                .toList();
    }

    public MealPlanResponse upsert(Long userId, MealPlanRequest request) {
        String mealType = validateMealType(request.getMealType());
        String name = request.getName() == null ? "" : request.getName().trim();
        Long newLinkedId = request.getLinkedFoodItemId();

        MealPlan plan = mealPlanRepository
                .findByUserIdAndMealDateAndMealType(userId, request.getMealDate(), mealType)
                .orElseGet(() -> MealPlan.builder()
                .userId(userId)
                .mealDate(request.getMealDate())
                .mealType(mealType)
                .build());

        Long previousLinkedId = plan.getLinkedFoodItemId();

        if (name.isBlank() && newLinkedId == null) {
            if (plan.getId() != null) {
                mealPlanRepository.delete(plan);
                releaseReservationIfUnused(previousLinkedId, plan.getId());
            }
            return new MealPlanResponse(null, request.getMealDate(), mealType, "", null, null);
        }

        FoodItem linkedItem = null;
        if (newLinkedId != null) {
            linkedItem = foodItemRepository.findByIdAndUserId(newLinkedId, userId)
                    .orElseThrow(() -> new ApiException("Linked food item not found.", HttpStatus.NOT_FOUND));
        }

        plan.setName(name);
        plan.setLinkedFoodItemId(newLinkedId);
        plan.setReminderSent(false);
        MealPlan saved = mealPlanRepository.save(plan);

        if (linkedItem != null) {
            linkedItem.setReserved(true);
            // Linking an item that's sitting in the Donation Listing (or, in
            // principle, already public) pulls it back into plain inventory
            // as reserved — it's earmarked for this meal now, not for
            // donation. This is what makes "Plan for Meal" from Browse Food
            // Item's own-listing view remove the item from Browse and revert
            // it to the Food Inventory as reserved.
            if (Boolean.TRUE.equals(linkedItem.getListedForDonation())) {
                linkedItem.setListedForDonation(false);
            }
            if (Boolean.TRUE.equals(linkedItem.getDonated())) {
                linkedItem.setDonated(false);
            }
            foodItemRepository.save(linkedItem);
        }
        if (!Objects.equals(previousLinkedId, newLinkedId)) {
            releaseReservationIfUnused(previousLinkedId, saved.getId());
        }

        activityLogService.record(userId, "MEAL_PLANNED", mealType, name, null);

        return MealPlanResponse.from(saved, linkedItem != null ? linkedItem.getName() : null);
    }

    public void delete(Long id, Long userId) {
        MealPlan plan = mealPlanRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException("Meal plan slot not found.", HttpStatus.NOT_FOUND));
        Long linkedId = plan.getLinkedFoodItemId();
        mealPlanRepository.delete(plan);
        releaseReservationIfUnused(linkedId, plan.getId());
    }

    private void releaseReservationIfUnused(Long linkedFoodItemId, Long excludePlanId) {
        if (linkedFoodItemId == null) {
            return;
        }
        long stillLinked = mealPlanRepository.countByLinkedFoodItemId(linkedFoodItemId);
        if (stillLinked == 0) {
            foodItemRepository.findById(linkedFoodItemId).ifPresent(item -> {
                item.setReserved(false);
                foodItemRepository.save(item);
            });
        }
    }

    private String resolveLinkedName(MealPlan plan, Map<Long, FoodItem> itemsById) {
        if (plan.getLinkedFoodItemId() == null) {
            return null;
        }
        FoodItem item = itemsById.get(plan.getLinkedFoodItemId());
        return item != null ? item.getName() : null;
    }

    private String validateMealType(String mealType) {
        if (mealType == null || !ALLOWED_MEAL_TYPES.contains(mealType)) {
            throw new ApiException("Invalid meal type.", HttpStatus.BAD_REQUEST);
        }
        return mealType;
    }
}
