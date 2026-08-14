package com.zerowaste.zerowaste.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.zerowaste.zerowaste.dto.AnalyticsSummaryResponse;
import com.zerowaste.zerowaste.dto.CategoryBreakdownResponse;
import com.zerowaste.zerowaste.dto.ChartBreakdownResponse;
import com.zerowaste.zerowaste.dto.CommunityImpactResponse;
import com.zerowaste.zerowaste.repository.FoodActivityLogRepository;
import com.zerowaste.zerowaste.repository.FoodItemRepository;

@Service
public class AnalyticsService {

    // Matches FoodItemService.ALLOWED_CATEGORIES; kept in this display order
    // so every chart always shows all five categories, even at 0%.
    private static final List<String> CATEGORY_ORDER = List.of("Vegetable", "Fruits", "Meat", "Dairy", "Other");

    private final FoodActivityLogRepository activityLogRepository;
    private final FoodItemRepository foodItemRepository;

    public AnalyticsService(FoodActivityLogRepository activityLogRepository, FoodItemRepository foodItemRepository) {
        this.activityLogRepository = activityLogRepository;
        this.foodItemRepository = foodItemRepository;
    }

    /**
     * Inclusive [start, end] window the analytics queries run over.
     */
    private record DateRange(LocalDate start, LocalDate end) {

    }

    /**
     * When the person picks a custom range from the date picker (startDate
     * and/or endDate provided), that always wins over the Week/Month/Year
     * preset. Otherwise falls back to the preset's usual window.
     */
    private DateRange resolveRange(String period, LocalDate startDate, LocalDate endDate) {
        if (startDate != null || endDate != null) {
            LocalDate start = startDate != null ? startDate : endDate;
            LocalDate end = endDate != null ? endDate : LocalDate.now();
            if (end.isBefore(start)) {
                LocalDate tmp = start;
                start = end;
                end = tmp;
            }
            return new DateRange(start, end);
        }
        return new DateRange(startOfPeriod(period), LocalDate.now());
    }

    private Instant startOfDayInstant(LocalDate date) {
        return date.atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    /**
     * Exclusive upper bound (start of the day AFTER the inclusive end date).
     */
    private Instant endOfDayInstant(LocalDate date) {
        return date.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    public AnalyticsSummaryResponse getSummary(Long userId, String period) {
        return getSummary(userId, period, null, null, null);
    }

    public AnalyticsSummaryResponse getSummary(Long userId, String period, String category) {
        return getSummary(userId, period, category, null, null);
    }

    /**
     * @param category optional category filter (e.g. "Dairy"); when null/blank,
     * every category is included.
     * @param startDate optional custom range start (inclusive) — overrides
     * period when set.
     * @param endDate optional custom range end (inclusive) — overrides period
     * when set.
     */
    public AnalyticsSummaryResponse getSummary(Long userId, String period, String category, LocalDate startDate,
            LocalDate endDate) {
        DateRange range = resolveRange(period, startDate, endDate);
        Instant since = startOfDayInstant(range.start());
        Instant until = endOfDayInstant(range.end());

        long used = countByCategory(
                activityLogRepository.findByUserIdAndTypeAndOccurredAtBetween(userId, "USED", since, until),
                category);
        long donated = countByCategory(
                activityLogRepository.findByUserIdAndTypeAndOccurredAtBetween(userId, "DONATED", since, until),
                category);

        // "Wasted" combines two things:
        // 1) items already removed after expiring (logged at delete time), and
        // 2) items that are *currently* sitting in the inventory past their
        // expiry date but haven't been used, donated, or removed yet —
        // these count as waste immediately, without waiting for the user
        // to delete them.
        long wastedLogged = countByCategory(
                activityLogRepository.findByUserIdAndTypeAndOccurredAtBetween(userId, "WASTED", since, until),
                category);
        long wastedLive = foodItemRepository.findByUserIdOrderByExpiryDateAsc(userId).stream()
                .filter(item -> !Boolean.TRUE.equals(item.getDonated()))
                .filter(item -> item.getExpiryDate() != null && !item.getExpiryDate().isAfter(range.end()))
                .filter(item -> item.getExpiryDate().isBefore(LocalDate.now()))
                .filter(item -> !item.getExpiryDate().isBefore(range.start()))
                .filter(item -> matchesCategory(item.getCategory(), category))
                .count();
        long wasted = wastedLogged + wastedLive;

        long saved = used + donated;
        long denominator = saved + wasted;
        // No activity and nothing currently spoiling yet = a clean 100%,
        // not 0% — the percentage only drops once waste actually happens.
        int wasteReducedPercent = denominator == 0 ? 100 : (int) Math.round(saved * 100.0 / denominator);

        return new AnalyticsSummaryResponse(used, donated, wasteReducedPercent, normalizePeriod(period));
    }

    private long countByCategory(List<com.zerowaste.zerowaste.model.FoodActivityLog> logs, String category) {
        return logs.stream().filter(log -> matchesCategory(log.getCategory(), category)).count();
    }

    private boolean matchesCategory(String itemCategory, String filterCategory) {
        return filterCategory == null || filterCategory.isBlank() || filterCategory.equalsIgnoreCase(itemCategory);
    }

    /**
     * Live snapshot of what's currently sitting in the user's Food Inventory,
     * grouped by category — not filtered by period, since it reflects "right
     * now", not history.
     */
    public ChartBreakdownResponse getInventoryOverview(Long userId) {
        return getInventoryOverview(userId, null);
    }

    public ChartBreakdownResponse getInventoryOverview(Long userId, String category) {
        List<String> categories = foodItemRepository.findByUserIdOrderByExpiryDateAsc(userId).stream()
                .filter(item -> !Boolean.TRUE.equals(item.getDonated()))
                .map(item -> item != null ? item.getCategory() : null)
                .filter(cat -> matchesCategory(cat, category))
                .toList();
        return buildBreakdown(categories);
    }

    /**
     * Category breakdown of items marked "Used" within the selected period —
     * this is what backs the Food Saved bar chart.
     */
    public ChartBreakdownResponse getFoodSavedBreakdown(Long userId, String period) {
        return getFoodSavedBreakdown(userId, period, null, null, null);
    }

    public ChartBreakdownResponse getFoodSavedBreakdown(Long userId, String period, String category) {
        return getFoodSavedBreakdown(userId, period, category, null, null);
    }

    public ChartBreakdownResponse getFoodSavedBreakdown(Long userId, String period, String category,
            LocalDate startDate, LocalDate endDate) {
        DateRange range = resolveRange(period, startDate, endDate);
        Instant since = startOfDayInstant(range.start());
        Instant until = endOfDayInstant(range.end());
        List<String> categories = activityLogRepository
                .findByUserIdAndTypeAndOccurredAtBetween(userId, "USED", since, until).stream()
                .map(item -> item != null ? item.getCategory() : null)
                .filter(Objects::nonNull)
                .filter(cat -> matchesCategory(cat, category))
                .toList();
        return buildBreakdown(categories);
    }

    /**
     * Sitewide impact numbers for the public homepage (Hero + Impact Strip).
     * Unlike {@link #getSummary}, this is never scoped to a single user — it
     * aggregates every user's
     * {@link com.zerowaste.zerowaste.model.FoodActivityLog} rows directly from
     * the database, so it stays accurate as new users sign up and log activity,
     * with no hardcoded or placeholder values.
     *
     * - foodSavedCount: every item any user has marked Used or Donated, ever. -
     * activeHouseholds: distinct users who have donated at least once — i.e.
     * real active donor households, not just "currently logged in". -
     * mealsSharedCount: total donations made across the whole community.
     */
    public CommunityImpactResponse getCommunityImpact() {
        long foodSaved = activityLogRepository.countByType("USED")
                + activityLogRepository.countByType("DONATED");
        long activeHouseholds = activityLogRepository.countDistinctUsersByType("DONATED");
        long mealsShared = activityLogRepository.countByType("DONATED");
        return new CommunityImpactResponse(foodSaved, activeHouseholds, mealsShared);
    }

    /**
     * Category breakdown of "wasted" items within the selected period — backs
     * the Waste by Category chart, so users can see which categories are
     * actually spoiling rather than being used or donated. Mirrors the two-part
     * definition of "wasted" used in getSummary(): items already logged as
     * WASTED (removed after expiring), plus items still sitting in the
     * inventory right now that are already past their expiry date but haven't
     * been used, donated, or deleted yet.
     */
    public ChartBreakdownResponse getWasteBreakdown(Long userId, String period) {
        return getWasteBreakdown(userId, period, null, null, null);
    }

    public ChartBreakdownResponse getWasteBreakdown(Long userId, String period, String category) {
        return getWasteBreakdown(userId, period, category, null, null);
    }

    public ChartBreakdownResponse getWasteBreakdown(Long userId, String period, String category,
            LocalDate startDate, LocalDate endDate) {
        DateRange range = resolveRange(period, startDate, endDate);
        Instant since = startOfDayInstant(range.start());
        Instant until = endOfDayInstant(range.end());

        List<String> loggedWasted = activityLogRepository
                .findByUserIdAndTypeAndOccurredAtBetween(userId, "WASTED", since, until).stream()
                .map(item -> item != null ? item.getCategory() : null)
                .filter(Objects::nonNull)
                .filter(cat -> matchesCategory(cat, category))
                .toList();

        List<String> liveWasted = foodItemRepository.findByUserIdOrderByExpiryDateAsc(userId).stream()
                .filter(item -> !Boolean.TRUE.equals(item.getDonated()))
                .filter(item -> item.getExpiryDate() != null && !item.getExpiryDate().isAfter(range.end()))
                .filter(item -> item.getExpiryDate().isBefore(LocalDate.now()))
                .filter(item -> !item.getExpiryDate().isBefore(range.start()))
                .map(item -> item != null ? item.getCategory() : null)
                .filter(Objects::nonNull)
                .filter(cat -> matchesCategory(cat, category))
                .toList();

        List<String> categories = new ArrayList<>(loggedWasted);
        categories.addAll(liveWasted);

        return buildBreakdown(categories);
    }

    private ChartBreakdownResponse buildBreakdown(List<String> categories) {
        Map<String, Long> counts = categories.stream()
                .collect(Collectors.groupingBy(c -> c, Collectors.counting()));
        long total = categories.size();

        List<CategoryBreakdownResponse> breakdown = CATEGORY_ORDER.stream()
                .map(cat -> {
                    long count = counts.getOrDefault(cat, 0L);
                    int percent = total == 0 ? 0 : (int) Math.round(count * 100.0 / total);
                    return new CategoryBreakdownResponse(cat, count, percent);
                })
                .toList();

        return new ChartBreakdownResponse(breakdown, total);
    }

    private LocalDate startOfPeriod(String period) {
        LocalDate today = LocalDate.now();
        if ("year".equalsIgnoreCase(period)) {
            return today.withDayOfYear(1);
        }
        if ("week".equalsIgnoreCase(period)) {
            // Start of the current ISO week (Monday on/before today).
            return today.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        }
        return today.withDayOfMonth(1);
    }

    private String normalizePeriod(String period) {
        if ("year".equalsIgnoreCase(period)) {
            return "year";
        }
        if ("week".equalsIgnoreCase(period)) {
            return "week";
        }
        if ("custom".equalsIgnoreCase(period)) {
            return "custom";
        }
        return "month";
    }
}
