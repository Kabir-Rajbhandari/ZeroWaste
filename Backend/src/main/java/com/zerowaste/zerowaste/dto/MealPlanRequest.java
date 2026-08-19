package com.zerowaste.zerowaste.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MealPlanRequest {

    private Long id;

    @NotNull(message = "Meal date is required.")
    private LocalDate mealDate;

    @NotBlank(message = "Meal type is required.")
    private String mealType;

    private String name;

    private Long linkedFoodItemId;
}
