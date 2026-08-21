import { test } from "../../fixtures/test.fixtures.js";
import { expect } from "@playwright/test";
import { farFutureExpiryDate } from "../../fixtures/testConfig.js";

test.describe("UC6 - Plan Weekly Meals & Recipe Suggestions", () => {
  test.describe("Using TEST_USER", () => {
    test.beforeEach(async ({ authedPage, dashboardPage }) => {
      await dashboardPage.goToMealPlanner();
    });

    test("Positive: Add Meal to Weekly Slot and Reserve Inventory Ingredients @uc6 @positive", async ({
      mealPlannerPage,
      inventoryPage,
      dashboardPage,
    }) => {
      await expect(mealPlannerPage.heading).toBeVisible();

      // Make sure there is at least one inventory ingredient available to
      // link, so this test doesn't depend on whatever happens to already
      // be in the account.
      const ingredientName = `QA Reserve Ingredient ${Date.now()}`;
      await dashboardPage.goToInventory();
      await inventoryPage.addItem({
        name: ingredientName,
        category: "Vegetable",
        quantity: 2,
        expiryDate: farFutureExpiryDate(30),
        storage: "Fridge",
      });
      await inventoryPage.expectItemVisible(ingredientName);

      // Actor Action: open an empty weekly slot, name the meal, and link
      // it to the inventory item just added.
      await dashboardPage.goToMealPlanner();
      await mealPlannerPage.openPlanModalForFirstEmptySlot();

      const mealName = `QA Reserve Meal ${Date.now()}`;
      await mealPlannerPage.mealNameInput.fill(mealName);

      // selectOption's {label} match requires an exact string and the
      // option text includes quantity/unit/reserved suffixes (see
      // MealPlanner.jsx), so look up the option's underlying value by
      // its (substring-matched) visible text instead of guessing the
      // full label.
      const ingredientOptionValue = await mealPlannerPage.linkedIngredientSelect
        .locator("option", { hasText: ingredientName })
        .first()
        .getAttribute("value");
      await mealPlannerPage.linkedIngredientSelect.selectOption(
        ingredientOptionValue,
      );
      await mealPlannerPage.saveMealButton.click();

      // System Response: the modal closes, the slot shows the planned
      // meal, and the linked ingredient becomes reserved.
      await expect(mealPlannerPage.planModal).toBeHidden();
      await mealPlannerPage.expectMealPlanned(mealName);

      await dashboardPage.goToInventory();
      await inventoryPage.expectItemReserved(ingredientName);
    });

    test("Positive: Recipe Suggestions Prioritised by Nearest Expiry @uc6 @positive", async ({
      mealPlannerPage,
      inventoryPage,
      dashboardPage,
    }) => {
      // Two ingredients TheMealDB reliably has recipes for, with distinct
      // expiry dates — "Chicken" expiring soon (should be queried first
      // and therefore surface first) and "Beef" expiring much later.
      const soonName = `Chicken QA ${Date.now()}`;
      const laterName = `Beef QA ${Date.now()}`;

      await dashboardPage.goToInventory();
      await inventoryPage.addItem({
        name: laterName,
        category: "Meat",
        quantity: 1,
        expiryDate: farFutureExpiryDate(60),
        storage: "Freezer",
      });
      await inventoryPage.addItem({
        name: soonName,
        category: "Meat",
        quantity: 1,
        expiryDate: farFutureExpiryDate(1),
        storage: "Fridge",
      });

      await dashboardPage.goToMealPlanner();
      await expect(mealPlannerPage.heading).toBeVisible();

      const suggestionsHeading = mealPlannerPage.page.getByRole("heading", {
        name: /Suggested Meal/i,
      });
      await expect(suggestionsHeading).toBeVisible();

      const usesBadges = mealPlannerPage.page.getByText(/^Uses: /);
      const hasSuggestions = await usesBadges
        .first()
        .isVisible({ timeout: 25_000 })
        .catch(() => false);
      test.skip(
        !hasSuggestions,
        "TheMealDB returned no ingredient-matched suggestions in this environment (third-party API dependency).",
      );

      // The nearest-expiry ingredient's own name is a substring of the
      // food item name (e.g. "Chicken" is in "Chicken QA 123") — the
      // FIRST "Uses:" badge should reference it, not the later-expiring
      // ingredient, proving suggestions are ordered by nearest expiry.
      const firstBadgeText = await usesBadges.first().textContent();
      expect(firstBadgeText).toContain("Chicken");
    });

    test("Negative: Meal Plan Cannot Be Saved Without a Meal Name @uc6 @negative", async ({
      mealPlannerPage,
    }) => {
      // Wait for the meal grid itself to finish loading before taking any
      // baseline count. MealPlanner.jsx renders a "Loading your meal
      // plan…" placeholder (zero td.meal-cell-hover cells at all, not
      // just zero empty ones) until its meals fetch resolves — counting
      // before that resolves can read a false 0/0 baseline.
      await expect(mealPlannerPage.heading).toBeVisible();
      await expect(mealPlannerPage.mealCells.first()).toBeVisible();

      // Baseline must be the count of already-EMPTY cells, not the total
      // cell count — TEST_USER is a shared/reused account, so earlier
      // tests in this suite (e.g. the "Add Meal to Weekly Slot" positive
      // test) may have already planned meals into some of this week's 28
      // slots before this test runs. Comparing against the total cell
      // count would fail even when nothing new was saved.
      const emptyCellsBefore = await mealPlannerPage.mealCells
        .filter({ hasNot: mealPlannerPage.page.locator(".meal-card-item") })
        .count();

      await mealPlannerPage.openPlanModalForFirstEmptySlot();

      // Actor Action: attempt to save with the Meal Name left blank and
      // no ingredient linked.
      await expect(mealPlannerPage.mealNameInput).toHaveValue("");
      await mealPlannerPage.saveMealButton.click();

      // System Response: a blank name + no linked ingredient is treated
      // as "nothing to save" and no-ops rather than persisting an empty
      // meal plan — the modal closes without error, and the number of
      // empty slots must be unchanged afterwards.
      //
      // NOTE: ".alert-danger" alone is NOT scoped to this action — the
      // SuggestedMeals panel (rendered on this same page, fetching from
      // TheMealDB independently on mount) renders its own, unrelated
      // ".alert-danger" if that third-party call fails/rate-limits,
      // which would false-fail this assertion regardless of whether the
      // blank-name save itself succeeded. MealPlanner's own status
      // banner is the only ".alert-danger" that also carries the
      // "mp-slide-in" class (see MealPlanner.jsx), so scope to that
      // combination to check only what this test actually cares about.
      await expect(mealPlannerPage.planModal).toBeHidden();
      await expect(
        mealPlannerPage.page.locator(".alert-danger.mp-slide-in"),
      ).toHaveCount(0);

      const emptyCellsAfter = await mealPlannerPage.mealCells
        .filter({ hasNot: mealPlannerPage.page.locator(".meal-card-item") })
        .count();
      expect(emptyCellsAfter).toBe(emptyCellsBefore);
    });
  });

  test.describe("Using TEST_USER_2 (fresh / low-activity account)", () => {
    test.beforeEach(async ({ authedPage2, dashboardPage }) => {
      await dashboardPage.goToMealPlanner();
    });

    test("Negative: Fallback Generic Recipes When No Inventory Matches @uc6 @negative", async ({
      mealPlannerPage,
    }) => {
      // TEST_USER_2 has no (or effectively no) inventory, so
      // SuggestedMeals.jsx can't build any ingredient-matched query and
      // must fall back to TheMealDB's random-recipe endpoint instead of
      // showing a blank panel.
      await expect(mealPlannerPage.heading).toBeVisible();

      const fallbackMessage = mealPlannerPage.page.getByText(
        "Add items to your Food Inventory to get suggestions tailored to what you have on hand. Showing general ideas for now.",
      );
      const noSuggestionsMessage = mealPlannerPage.page.getByText(
        "No suggestions available right now.",
      );

      // Race the two legitimate outcomes: the fallback banner + generic
      // recipes, or (only if the third-party recipe API itself is
      // unreachable from this environment) the graceful "no suggestions"
      // message — either way, never an unhandled error.
      const outcome = await Promise.race([
        fallbackMessage
          .waitFor({ state: "visible", timeout: 15_000 })
          .then(() => "fallback"),
        noSuggestionsMessage
          .waitFor({ state: "visible", timeout: 15_000 })
          .then(() => "no-suggestions"),
      ]).catch(() => "timeout");

      expect(
        outcome,
        "SuggestedMeals never resolved to either the fallback state or the graceful empty state.",
      ).not.toBe("timeout");

      if (outcome === "fallback") {
        await expect(fallbackMessage).toBeVisible();
        await expect(mealPlannerPage.page.getByText(/^Uses: /)).toHaveCount(0);
      }
    });
  });
});
