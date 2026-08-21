import { test } from "../../fixtures/test.fixtures.js";
import { expect } from "@playwright/test";

test.describe("UC4 - View Analytics Summary Dashboard", () => {
  test.describe("Using TEST_USER", () => {
    test.beforeEach(async ({ authedPage, dashboardPage }) => {
      await dashboardPage.goToAnalytics();
    });

    test("Positive: View Analytics Summary Dashboard @uc4 @positive", async ({
      analyticsPage,
    }) => {
      // Actor Action 1 / System Response: opening Analytics loads the
      // food-saving summary dashboard.
      await expect(analyticsPage.heading).toBeVisible();
      await expect(analyticsPage.loadingMessage).toBeHidden({
        timeout: 15_000,
      });

      // The dashboard must always land on ONE of: real stat cards, or the
      // explicit "no data yet" empty state — never stuck loading, never a
      // blank page.
      const hasData = await analyticsPage.foodSavedStat
        .isVisible()
        .catch(() => false);

      if (hasData) {
        await analyticsPage.expectStatCardsVisible();
      } else {
        await analyticsPage.expectEmptyState();
      }

      await expect(analyticsPage.errorAlertBanner).toHaveCount(0);
    });

    test("Positive: Filter Analytics Report by Monthly Date Range @uc4 @positive", async ({
      analyticsPage,
    }) => {
      await expect(analyticsPage.heading).toBeVisible();
      await expect(analyticsPage.loadingMessage).toBeHidden({
        timeout: 15_000,
      });

      // Actor Action 3: apply a monthly date-range filter via the
      // date-range picker's "This month" preset (DateRangePicker.jsx).
      await analyticsPage.selectDateRangePreset("This month");

      // System Response: the report updates in place — no full page
      // reload / navigation away from the dashboard sub-view — and shows
      // either the filtered data or the explicit empty state for that
      // range, never an indefinite spinner or an error.
      await expect(analyticsPage.loadingMessage).toBeHidden({
        timeout: 15_000,
      });
      await expect(analyticsPage.page).toHaveURL(/.*dashboard/);
      await expect(analyticsPage.errorAlertBanner).toHaveCount(0);

      const hasData = await analyticsPage.foodSavedStat
        .isVisible()
        .catch(() => false);
      if (hasData) {
        await analyticsPage.expectStatCardsVisible();
      } else {
        await analyticsPage.expectEmptyState();
      }

      // Clearing the range returns to the default (unfiltered) period —
      // proves the filter is a real, reversible, in-place state change.
      await analyticsPage.clearDateRange();
      await expect(analyticsPage.clearDateRangeButton).toBeHidden();
    });

    test("Negative: Analytics Filter Returns No Data for Selected Range @uc4 @negative", async ({
      analyticsPage,
    }) => {
      // A far-future custom range realistically has zero recorded
      // activity — exercises the "no data for this range" path without
      // depending on any particular account's current state.
      await analyticsPage.openDateRangePicker();

      // Jump the calendar forward a year so both endpoints land in a
      // guaranteed-empty month, then pick its 1st and 2nd day.
      for (let i = 0; i < 12; i += 1) {
        await analyticsPage.dateRangeDialog
          .getByRole("button", { name: "Next month" })
          .click();
      }
      const dayCells = analyticsPage.dateRangeDialog.locator(
        "div[style*='grid-template-columns'] button:not([disabled])",
      );
      await dayCells.first().click();
      await dayCells.nth(1).click();

      // System must degrade gracefully: no crash, no error banner, and
      // the explicit empty state — never a raw error from the backend
      // for a legitimately empty range.
      await expect(analyticsPage.loadingMessage).toBeHidden({
        timeout: 15_000,
      });
      await expect(analyticsPage.errorAlertBanner).toHaveCount(0);
      await analyticsPage.expectEmptyState();
    });
  });

  test.describe("Using TEST_USER_2 (fresh / low-activity account)", () => {
    test.beforeEach(async ({ authedPage2, dashboardPage }) => {
      await dashboardPage.goToAnalytics();
    });

    test("Negative: Analytics Dashboard Shows Empty State for New User @uc4 @negative", async ({
      analyticsPage,
    }) => {
      await expect(analyticsPage.heading).toBeVisible();
      await expect(analyticsPage.loadingMessage).toBeHidden({
        timeout: 15_000,
      });
      await expect(analyticsPage.errorAlertBanner).toHaveCount(0);
      await analyticsPage.expectEmptyState();
    });
  });
});
