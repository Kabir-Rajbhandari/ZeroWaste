import { expect } from "@playwright/test";
import { BasePage } from "./BasePage.js";

export class InventoryPage extends BasePage {
  constructor(page) {
    super(page);

    this.addFoodItemsButton = page.getByRole("button", {
      name: "Add Food Items",
    });
    this.searchInput = page.getByPlaceholder("Search");

    // "Add Food Item" modal fields
    this.nameInput = page.getByRole("textbox", { name: "Apple" });
    this.categorySelect = page.locator('select[name="category"]');
    this.quantityInput = page.getByPlaceholder("2");
    this.expiryDateInput = page.locator('input[name="expiryDate"]');
    this.storageSelect = page.locator('select[name="storage"]');
    this.saveItemButton = page.getByRole("button", { name: "Save Item" });

    // "Edit Food Item" modal fields
    this.editFoodNameInput = page.getByRole("textbox", { name: "Food name" });
    this.editCategorySelect = page.getByLabel("Category");
    this.editQuantityInput = page.getByRole("spinbutton", { name: "Quantity" });
    this.editExpiryDateInput = page.getByRole("textbox", {
      name: "Expiry date",
    });
    this.saveChangesButton = page.getByRole("button", { name: "Save Changes" });

    this.usedButtons = page.getByRole("button", { name: "Used", exact: true });
    this.editButtons = page.getByRole("button", { name: "Edit", exact: true });
    this.convertToDonationButtons = page.getByRole("button", {
      name: "Convert to Donation",
    });

    // FoodInventory.jsx renders Used / Delete / Convert-to-Donation
    // confirmations through a shared in-page <InlineConfirmDialog>, NOT a
    // native browser confirm() — so they must be clicked through, never
    // handled via page.on("dialog", ...).
    this.confirmDialog = page.getByRole("dialog");
    this.confirmDialogConfirmButton = this.confirmDialog.getByRole("button", {
      name: /^(OK|Convert|Delete)$/,
    });
    this.confirmDialogCancelButton = this.confirmDialog.getByRole("button", {
      name: "Cancel",
    });
  }

  async openAddItemForm() {
    await this.addFoodItemsButton.click();
  }

  /** Positive path: adds a valid item (UC2 "Add Food Item"). */
  async addItem({ name, category, quantity, expiryDate, storage }) {
    await this.openAddItemForm();
    await this.nameInput.click();
    await this.nameInput.fill(name);
    await this.categorySelect.selectOption(category);
    await this.quantityInput.click();
    await this.quantityInput.fill(String(quantity));
    await this.expiryDateInput.fill(expiryDate);
    await this.storageSelect.selectOption(storage);
    await this.saveItemButton.click();
  }

  /** Negative path: submits the Add Food Item form without a category. */
  async submitIncompleteAddItem({ name }) {
    await this.openAddItemForm();
    await this.nameInput.click();
    await this.nameInput.fill(name);
    await this.saveItemButton.click();
  }

  async expectValidationMessage(message) {
    await expect(this.page.getByText(message)).toBeVisible();
  }

  async openEditForm(index = 0) {
    await this.editButtons.nth(index).click();
  }

  async editItem({ name, category, quantity, expiryDate }) {
    if (name !== undefined) {
      await this.editFoodNameInput.click();
      await this.editFoodNameInput.fill(name);
    }
    if (category !== undefined) {
      await this.editCategorySelect.selectOption(category);
    }
    if (quantity !== undefined) {
      await this.editQuantityInput.click();
      await this.editQuantityInput.fill(String(quantity));
    }
    if (expiryDate !== undefined) {
      await this.editExpiryDateInput.fill(expiryDate);
    }
    await this.saveChangesButton.click();
  }

  /**
   * Marks the nth "Used" item. "Used" opens FoodInventory.jsx's in-page
   * <InlineConfirmDialog> (an actual rendered modal, not a native
   * browser confirm()), so it must be clicked through rather than
   * handled via page.on("dialog", ...).
   */
  async markUsed(index = 0) {
    await this.usedButtons.nth(index).click();
    await expect(this.confirmDialog).toBeVisible();
    await this.confirmDialogConfirmButton.click();
    await expect(this.confirmDialog).toBeHidden();
  }

  /**
   * Marks a specific named item as Used. Filters the list down to just
   * that item via the search box first (same proven pattern as
   * expectItemVisible), then clicks the one "Used" button now on screen
   * — avoids fragile DOM-structure guessing entirely.
   */
  async markItemUsedByName(name) {
    await this.searchInput.click();
    await this.searchInput.fill(name);
    await expect(this.usedButtons.first()).toBeVisible({ timeout: 10_000 });

    await this.usedButtons.first().click();
    await expect(this.confirmDialog).toBeVisible();
    await this.confirmDialogConfirmButton.click();
    await expect(this.confirmDialog).toBeHidden();
    await this.searchInput.fill("");
  }

  /**
   * Converts a named item to a donation listing. Only works if the item's
   * expiry date is within the app's donation-eligibility window (0-7 days
   * out — see FoodInventory.jsx's handleConvertToDonation). Use
   * donationEligibleExpiryDate() from fixtures/testConfig.js when adding
   * an item that a test intends to convert.
   *
   * Filters the list down to just this item via the search box first
   * (same proven pattern as expectItemVisible) so there's exactly one
   * "Convert to Donation" button on screen to click.
   *
   * NOTE: on success, FoodInventory.jsx navigates the whole dashboard to
   * the Donation Listing page (onNavigate("donation-listing")) — this
   * page's own locators (search box, etc.) will no longer be present
   * afterwards. Assert against DonationListing.jsx's own elements instead.
   */
  async convertItemToDonation(name) {
    await this.searchInput.click();
    await this.searchInput.fill(name);
    await expect(this.convertToDonationButtons.first()).toBeVisible({
      timeout: 10_000,
    });

    await this.convertToDonationButtons.first().click();
    await expect(this.confirmDialog).toBeVisible();

    // Guard against the "Not eligible for donation yet" info dialog, which
    // shares the same role="dialog" but only has an OK/dismiss button —
    // fail with a clear message instead of a confusing timeout downstream.
    const isIneligible = await this.page
      .getByText(/not eligible for donation yet/i)
      .isVisible()
      .catch(() => false);
    if (isIneligible) {
      throw new Error(
        `"${name}" isn't within the app's 0-7 day donation-eligibility window. ` +
          "Use donationEligibleExpiryDate() from testConfig.js for items you intend to donate.",
      );
    }
    await this.confirmDialogConfirmButton.click();
    await expect(this.confirmDialog).toBeHidden();
  }

  async expectItemVisible(name) {
    await this.searchInput.click();
    await this.searchInput.fill(name);
    await expect(
      this.page.getByText(name, { exact: false }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await this.searchInput.fill("");
  }

  async expectItemReserved(name) {
    await this.searchInput.click();
    await this.searchInput.fill(name);
    await expect(
      this.page.getByText(name, { exact: false }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      this.page.getByText("Reserved", { exact: true }),
    ).toBeVisible();
    await this.searchInput.fill("");
  }
}
