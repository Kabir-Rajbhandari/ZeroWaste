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

    // "Plan {meal}" modal — opened by clicking any empty meal-slot cell.
    this.planModal = page.getByRole("dialog");
    this.mealNameInput = page.getByPlaceholder(
      "e.g. Scrambled Eggs with Toast",
    );
    this.linkedIngredientSelect = page.getByLabel("Link Inventory Ingredient");
    this.saveMealButton = page.getByRole("button", { name: "Save Meal" });
    this.cancelModalButton = this.planModal.getByRole("button", {
      name: "Cancel",
    });
    this.closeModalButton = page.getByRole("button", { name: "Close" });

    // Any empty (unplanned) grid cell — clicking one opens the plan modal.
    this.emptyMealCell = page.locator("td.meal-cell-hover").first();
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
