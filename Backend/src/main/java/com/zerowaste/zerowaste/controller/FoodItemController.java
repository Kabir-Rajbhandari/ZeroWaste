package com.zerowaste.zerowaste.controller;

import com.zerowaste.zerowaste.dto.DonateRequest;
import com.zerowaste.zerowaste.dto.FoodItemRequest;
import com.zerowaste.zerowaste.dto.FoodItemResponse;
import com.zerowaste.zerowaste.service.FoodItemService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/food-items")
public class FoodItemController {

    private final FoodItemService foodItemService;

    public FoodItemController(FoodItemService foodItemService) {
        this.foodItemService = foodItemService;
    }

    @GetMapping
    public List<FoodItemResponse> list(@AuthenticationPrincipal Long userId) {
        return foodItemService.getAllForUser(userId);
    }

    @GetMapping("/browse")
    public List<FoodItemResponse> browse(@AuthenticationPrincipal Long userId) {
        return foodItemService.getAvailableForBrowse(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FoodItemResponse create(
            @Valid @RequestBody FoodItemRequest request,
            @AuthenticationPrincipal Long userId) {
        return foodItemService.create(request, userId);
    }

    @PutMapping("/{id}")
    public FoodItemResponse update(
            @PathVariable Long id,
            @Valid @RequestBody FoodItemRequest request,
            @AuthenticationPrincipal Long userId) {
        return foodItemService.update(id, request, userId);
    }

    @PostMapping("/{id}/donate")
    public FoodItemResponse donate(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) DonateRequest request,
            @AuthenticationPrincipal Long userId) {
        return foodItemService.donate(id, userId, request);
    }

    @PostMapping("/{id}/claim")
    public FoodItemResponse claim(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        return foodItemService.claim(id, userId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        foodItemService.delete(id, userId);
    }
}