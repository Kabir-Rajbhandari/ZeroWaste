package com.zerowaste.zerowaste.controller;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.zerowaste.zerowaste.dto.AnalyticsSummaryResponse;
import com.zerowaste.zerowaste.dto.ChartBreakdownResponse;
import com.zerowaste.zerowaste.dto.CommunityImpactResponse;
import com.zerowaste.zerowaste.service.AnalyticsService;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/summary")
    public AnalyticsSummaryResponse summary(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal Long userId) {
        return analyticsService.getSummary(userId, period, category, startDate, endDate);
    }

    @GetMapping("/inventory-overview")
    public ChartBreakdownResponse inventoryOverview(
            @RequestParam(required = false) String category,
            @AuthenticationPrincipal Long userId) {
        return analyticsService.getInventoryOverview(userId, category);
    }

    @GetMapping("/food-saved-breakdown")
    public ChartBreakdownResponse foodSavedBreakdown(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal Long userId) {
        return analyticsService.getFoodSavedBreakdown(userId, period, category, startDate, endDate);
    }

    // Public endpoint (see SecurityConfig) — powers the homepage stats for
    // every visitor, logged in or not, so it takes no userId and always
    // returns sitewide totals.
    @GetMapping("/community-impact")
    public CommunityImpactResponse communityImpact() {
        return analyticsService.getCommunityImpact();
    }

    @GetMapping("/waste-breakdown")
    public ChartBreakdownResponse wasteBreakdown(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @AuthenticationPrincipal Long userId) {
        return analyticsService.getWasteBreakdown(userId, period, category, startDate, endDate);
    }
}
