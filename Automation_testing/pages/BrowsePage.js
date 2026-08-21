import { expect } from "@playwright/test";
import { BasePage } from "./BasePage.js";

export class BrowsePage extends BasePage {
  constructor(page) {
    super(page);

    // The filter bar has 3 <select> elements (category, type, expiry).
    // Category is the first one rendered (BrowseFoodItem.jsx "Tier 2:
    // Categorical Filter Dropdowns" section).
    this.categoryFilter = page.getByRole("combobox").first();
    this.viewDetailsButtons = page.getByRole("button", {
      name: "View Details",
    });
    this.contactDonorButton = page.getByRole("button", {
      name: "Contact Donor",
    });
    this.backButton = page.getByRole("button", { name: "Back" });
    // BrowseFoodItem.jsx renders "No matching food items found" (with a
    // "Try adjusting your search query or clearing active filters" hint)
    // when the active filters produce zero results — NOT "No donated
    // items are...", which does not appear anywhere in this component.
    this.emptyStateText = page.getByText("No matching food items found");
  }

  async filterByCategory(category) {
    await this.categoryFilter.selectOption(category);
  }

  async openItemDetails(index = 0) {
    await this.viewDetailsButtons.nth(index).click();
  }

  async expectEmptyState() {
    await expect(this.emptyStateText.first()).toBeVisible();
  }

  async expectListingVisible(name) {
    await expect(
      this.page.getByText(name, { exact: false }).first(),
    ).toBeVisible();
  }
}
