import { expect } from "@playwright/test";
import { BasePage } from "./BasePage.js";

export class MealPlannerPage extends BasePage {
  constructor(page) {
    super(page);

    this.heading = page.getByRole("heading", { name: "Meal Planner" });
    this.confirmPlanButton = page.getByRole("button", {
      name: /Confirm & Save Plan|Confirming…/,
    });
    this.weekViewButton = page.getByRole("button", {
      name: "week",
      exact: true,
    });
    this.monthViewButton = page.getByRole("button", {
      name: "month",
      exact: true,
    });
    this.prevButton = page.getByRole("button", { name: "Previous" });
    this.nextButton = page.getByRole("button", { name: "Next" });

    // "Plan {meal}" modal — opened by clicking any meal-slot cell (empty
    // or already-planned; the same modal is reused for editing).
    this.planModal = page.getByRole("dialog");
    this.mealNameInput = page.getByPlaceholder(
      "e.g. Scrambled Eggs with Toast",
    );
    // "Link Inventory Ingredient" is a plain <label> that is NOT
    // htmlFor-associated with (or wrapped around) its <select> in
    // MealPlanner.jsx, so getByLabel() cannot find it — it is the only
    // <select> rendered inside the modal, so scope to that instead.
    this.linkedIngredientSelect = this.planModal.locator("select");
    this.saveMealButton = page.getByRole("button", { name: "Save Meal" });
    this.cancelModalButton = this.planModal.getByRole("button", {
      name: "Cancel",
    });
    this.closeModalButton = this.planModal.getByRole("button", {
      name: "Close",
    });

    // Every grid cell (empty or already-planned) shares the
    // "meal-cell-hover" class, so a bare `.first()` can land on an
    // already-planned cell if seed data exists. Filter out cells that
    // contain a rendered ".meal-card-item" (MealPlanner.jsx only renders
    // that when the slot has a saved meal) to reliably find a genuinely
    // empty slot.
    this.mealCells = page.locator("td.meal-cell-hover");
    this.emptyMealCell = this.mealCells
      .filter({ hasNot: page.locator(".meal-card-item") })
      .first();
  }

  async switchToWeekView() {
    await this.weekViewButton.click();
  }

  async switchToMonthView() {
    await this.monthViewButton.click();
  }

  /** Opens the "Plan {meal}" modal for the first empty slot found in the grid. */
  async openPlanModalForFirstEmptySlot() {
    await this.emptyMealCell.click();
    await expect(this.planModal).toBeVisible();
  }

  async planMeal({ mealName, linkedIngredientLabel }) {
    await this.mealNameInput.fill(mealName);
    if (linkedIngredientLabel) {
      await this.linkedIngredientSelect.selectOption({
        label: linkedIngredientLabel,
      });
    }
    await this.saveMealButton.click();
  }

  async cancelPlanModal() {
    await this.cancelModalButton.click();
  }

  async confirmWeeklyPlan() {
    await this.confirmPlanButton.click();
  }

  async expectMealPlanned(mealName) {
    await expect(
      this.page.getByText(mealName, { exact: false }).first(),
    ).toBeVisible();
  }
}
