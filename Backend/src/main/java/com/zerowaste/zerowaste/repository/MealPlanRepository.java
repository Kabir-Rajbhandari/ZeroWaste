package com.zerowaste.zerowaste.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zerowaste.zerowaste.model.MealPlan;

public interface MealPlanRepository extends JpaRepository<MealPlan, Long> {

    List<MealPlan> findByUserIdAndMealDateBetweenOrderByMealDateAsc(Long userId, LocalDate start, LocalDate end);

    Optional<MealPlan> findByIdAndUserId(Long id, Long userId);

    Optional<MealPlan> findByUserIdAndMealDateAndMealType(Long userId, LocalDate mealDate, String mealType);

    long countByLinkedFoodItemId(Long linkedFoodItemId);

    List<MealPlan> findByMealDateAndReminderSentFalse(LocalDate mealDate);
}
