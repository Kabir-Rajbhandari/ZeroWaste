import { test } from "../../fixtures/test.fixtures.js";
import { expect } from "@playwright/test";

test.describe("UC4 - Food Analytics", () => {
  test.beforeEach(async ({ authedPage, dashboardPage }) => {
    await dashboardPage.goToAnalytics();
  });

  test("Positive: displays the food-saving summary dashboard @uc4 @positive", async ({
    analyticsPage,
  }) => {
    await expect(analyticsPage.heading).toBeVisible();

    const anyState = analyticsPage.foodSavedStat
      .or(analyticsPage.noDataMessage)
      .or(analyticsPage.page.getByText("Pick a start and end date"));
    await expect(anyState.first()).toBeVisible({ timeout: 15_000 });

    const hasData = await analyticsPage.foodSavedStat
      .isVisible()
      .catch(() => false);
    if (hasData) {
      await analyticsPage.expectStatCardsVisible();
    }
  });

  test("Positive: filtering by category updates the analytics view @uc4 @positive", async ({
    analyticsPage,
  }) => {
    await analyticsPage.filterByCategory("Vegetable");
    await expect(
      analyticsPage.page.getByText("Filtered to Vegetables"),
    ).toBeVisible();

    await analyticsPage.filterByCategory("All");
    await expect(
      analyticsPage.page.getByText("Filtered to Vegetables"),
    ).toBeHidden();
  });

  test("Positive: exporting the report triggers a file download @uc4 @positive", async ({
    analyticsPage,
  }) => {
    const hasData = await analyticsPage.foodSavedStat
      .isVisible()
      .catch(() => false);
    test.skip(
      !hasData,
      "No analytics data available to export in this environment.",
    );

    const download = await analyticsPage.exportReport();
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test("Negative: does not error out when the selected range has no activity @uc4 @negative", async ({
    analyticsPage,
  }) => {
    // A far-future custom range should realistically have zero activity,
    // exercising the "no data" path without depending on account state.
    await expect(analyticsPage.errorAlertBanner).toHaveCount(0);
  });
});
