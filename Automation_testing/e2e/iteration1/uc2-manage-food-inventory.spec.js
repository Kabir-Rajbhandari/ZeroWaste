import { test } from "../../fixtures/test.fixtures.js";
import { expect } from "@playwright/test";
import {
  donationEligibleExpiryDate,
  farFutureExpiryDate,
} from "../../fixtures/testConfig.js";

test.describe("UC2 - Manage Food Inventory", () => {
  test.beforeEach(async ({ authedPage, dashboardPage }) => {
    await dashboardPage.goToInventory();
  });

  test("Positive: adds a new food item with all required fields @uc2 @positive", async ({
    inventoryPage,
  }) => {
    const itemName = `Apple QA ${Date.now()}`;

    await inventoryPage.addItem({
      name: itemName,
      category: "Vegetable",
      quantity: 6,
      expiryDate: farFutureExpiryDate(),
      storage: "Fridge",
    });

    await inventoryPage.expectItemVisible(itemName);
  });

  test("Positive: edits an existing inventory item's details @uc2 @positive", async ({
    inventoryPage,
  }) => {
    const updatedName = `Apple Edited ${Date.now()}`;

    await inventoryPage.openEditForm(0);
    await inventoryPage.editItem({
      name: updatedName,
      category: "Fruits",
      quantity: 8,
      expiryDate: farFutureExpiryDate(200),
    });

    await inventoryPage.expectItemVisible(updatedName);
  });

  test("Positive: marks an inventory item as Used @uc2 @positive", async ({
    inventoryPage,
  }) => {
    // Add a fresh, uniquely-named item so this test doesn't depend on
    // whatever else already exists in the account (avoids the earlier
    // bug where counting buttons on a paginated list gave a false
    // negative — a removed row gets backfilled from the next page).
    const itemName = `Apple Used ${Date.now()}`;
    await inventoryPage.addItem({
      name: itemName,
      category: "Vegetable",
      quantity: 2,
      expiryDate: farFutureExpiryDate(),
      storage: "Fridge",
    });
    await inventoryPage.expectItemVisible(itemName);
    await inventoryPage.markItemUsedByName(itemName);

    await inventoryPage.searchInput.fill(itemName);
    await expect(inventoryPage.page.getByText(itemName)).toHaveCount(0);
  });

  test("Positive: converts an eligible item to a donation listing @uc2 @positive", async ({
    inventoryPage,
    dashboardPage,
  }) => {
    // This test doubles as fixture-data setup for UC3's browse/donation
    // tests: donations are stored server-side, so any listing created
    // here remains available for every future test run too.
    const itemName = `Apple Donate ${Date.now()}`;

    await inventoryPage.addItem({
      name: itemName,
      category: "Fruits",
      quantity: 3,
      expiryDate: donationEligibleExpiryDate(3),
      storage: "Fridge",
    });
    await inventoryPage.expectItemVisible(itemName);
    await inventoryPage.convertItemToDonation(itemName);

    // Converting navigates the whole dashboard to the Donation Listing
    // page — assert against that page, not the Inventory page we left.
    await expect(
      inventoryPage.page.getByRole("heading", { name: "Donation Listing" }),
    ).toBeVisible();
    await expect(
      inventoryPage.page.getByText(itemName, { exact: false }).first(),
    ).toBeVisible();
  });

  test("Negative: blocks submission when category is not selected @uc2 @negative", async ({
    inventoryPage,
  }) => {
    await inventoryPage.submitIncompleteAddItem({ name: "Mango" });
    await inventoryPage.expectValidationMessage("Please select a category.");
  });
});
