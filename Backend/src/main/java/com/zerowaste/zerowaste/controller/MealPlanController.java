package com.zerowaste.zerowaste.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.zerowaste.zerowaste.dto.MealPlanRequest;
import com.zerowaste.zerowaste.dto.MealPlanResponse;
import com.zerowaste.zerowaste.service.MealPlanService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/meal-plans")
public class MealPlanController {

    private final MealPlanService mealPlanService;

    public MealPlanController(MealPlanService mealPlanService) {
        this.mealPlanService = mealPlanService;
    }

    @GetMapping
    public List<MealPlanResponse> getRange(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate,
            @AuthenticationPrincipal Long userId) {
        return mealPlanService.getForRange(userId, startDate, endDate);
    }

    @PutMapping
    public MealPlanResponse upsert(
            @Valid @RequestBody MealPlanRequest request,
            @AuthenticationPrincipal Long userId) {
        return mealPlanService.upsert(userId, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        mealPlanService.delete(id, userId);
    }
}
