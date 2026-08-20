import { test } from "../../fixtures/test.fixtures.js";
import { expect } from "@playwright/test";

test.describe("UC6 - Plan Weekly Meals", () => {
  test.beforeEach(async ({ authedPage, dashboardPage }) => {
    await dashboardPage.goToMealPlanner();
  });

  test("Positive: displays the weekly meal planner grid @uc6 @positive", async ({
    mealPlannerPage,
  }) => {
    await expect(mealPlannerPage.heading).toBeVisible();
    await expect(mealPlannerPage.confirmPlanButton).toBeVisible();
  });

  test("Positive: plans a meal by linking an inventory ingredient @uc6 @positive", async ({
    mealPlannerPage,
  }) => {
    await mealPlannerPage.openPlanModalForFirstEmptySlot();

    const optionCount = await mealPlannerPage.linkedIngredientSelect
      .locator("option")
      .count();
    test.skip(
      optionCount <= 1,
      "No inventory ingredients available to link in this environment.",
    );

    const mealName = `QA Test Meal ${Date.now()}`;
    const firstIngredientLabel = await mealPlannerPage.linkedIngredientSelect
      .locator("option")
      .nth(1)
      .textContent();

    await mealPlannerPage.mealNameInput.fill(mealName);
    await mealPlannerPage.linkedIngredientSelect.selectOption({ index: 1 });
    await mealPlannerPage.saveMealButton.click();

    await expect(mealPlannerPage.planModal).toBeHidden();
    await mealPlannerPage.expectMealPlanned(mealName);
    expect(firstIngredientLabel).toBeTruthy();
  });

  test("Alternative 4a: plans a custom meal with no linked ingredient @uc6 @positive", async ({
    mealPlannerPage,
  }) => {
    await mealPlannerPage.openPlanModalForFirstEmptySlot();

    const mealName = `Generic Custom Meal ${Date.now()}`;
    await mealPlannerPage.planMeal({ mealName });

    await expect(mealPlannerPage.planModal).toBeHidden();
    await mealPlannerPage.expectMealPlanned(mealName);
  });

  test("Positive: cancelling the plan modal discards changes @uc6 @negative", async ({
    mealPlannerPage,
  }) => {
    await mealPlannerPage.openPlanModalForFirstEmptySlot();
    await mealPlannerPage.mealNameInput.fill("Should not be saved");
    await mealPlannerPage.cancelPlanModal();

    await expect(mealPlannerPage.planModal).toBeHidden();
    await expect(
      mealPlannerPage.page.getByText("Should not be saved"),
    ).toHaveCount(0);
  });

  test("Positive: confirming the weekly plan shows a success or informational message @uc6 @positive", async ({
    mealPlannerPage,
  }) => {
    await mealPlannerPage.confirmWeeklyPlan();
    await expect(
      mealPlannerPage.page.locator(".alert-success, .alert-info"),
    ).toBeVisible({
      timeout: 10_000,
    });
  });
});
