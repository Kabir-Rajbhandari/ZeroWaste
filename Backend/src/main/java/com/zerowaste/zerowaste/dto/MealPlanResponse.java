package com.zerowaste.zerowaste.dto;

import java.time.LocalDate;

import com.zerowaste.zerowaste.model.MealPlan;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class MealPlanResponse {

    private Long id;
    private LocalDate mealDate;
    private String mealType;
    private String name;
    private Long linkedFoodItemId;
    private String linkedFoodItemName;

    public static MealPlanResponse from(MealPlan plan, String linkedFoodItemName) {
        return new MealPlanResponse(
                plan.getId(),
                plan.getMealDate(),
                plan.getMealType(),
                plan.getName(),
                plan.getLinkedFoodItemId(),
                linkedFoodItemName);
    }
}