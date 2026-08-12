package com.zerowaste.zerowaste.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.zerowaste.zerowaste.dto.DonateRequest;
import com.zerowaste.zerowaste.dto.FoodItemRequest;
import com.zerowaste.zerowaste.dto.FoodItemResponse;
import com.zerowaste.zerowaste.service.DonationRequestService;
import com.zerowaste.zerowaste.service.FoodItemService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/food-items")
public class FoodItemController {

    private final FoodItemService foodItemService;
    private final DonationRequestService donationRequestService;

    public FoodItemController(FoodItemService foodItemService, DonationRequestService donationRequestService) {
        this.foodItemService = foodItemService;
        this.donationRequestService = donationRequestService;
    }

    @GetMapping("/recent-activity")
    public List<com.zerowaste.zerowaste.model.FoodActivityLog> recentActivity(
            @RequestParam(defaultValue = "6") int limit,
            @AuthenticationPrincipal Long userId) {
        return foodItemService.getRecentActivity(userId, limit);
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

    @PostMapping("/{id}/use")
    public FoodItemResponse markUsed(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        return foodItemService.markUsed(id, userId);
    }

    @PostMapping("/{id}/donate")
    public FoodItemResponse donate(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) DonateRequest request,
            @AuthenticationPrincipal Long userId) {
        return foodItemService.donate(id, userId, request);
    }

    /**
     * Sends a claim request to the donor instead of transferring the item
     * immediately. The donor accepts or declines it from their Notifications
     * page; only then does the item move into a Food Inventory.
     */
    @PostMapping("/{id}/claim")
    public void claim(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        donationRequestService.requestClaim(id, userId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal Long userId) {
        foodItemService.delete(id, userId);
    }
}
