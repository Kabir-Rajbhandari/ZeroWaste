import { expect } from "@playwright/test";
import { BasePage } from "./BasePage.js";

export class AnalyticsPage extends BasePage {
  constructor(page) {
    super(page);

    this.heading = page.getByRole("heading", { name: "Analytics" });
    this.categoryFilter = page.getByLabel("Filter analytics by category");
    this.exportReportButton = page.getByRole("button", {
      name: "Export Report",
    });

    // Stat cards (StatCard label prop)
    this.foodSavedStat = page.getByText("Food Saved");
    this.donationsMadeStat = page.getByText("Donations Made");
    this.wasteReducedStat = page.getByText("Waste Reduced");

    this.noDataMessage = page.getByText("No food-saving data yet");
    this.loadingMessage = page.getByText("Loading analytics…");
    this.clearDateRangeButton = page.getByRole("button", { name: "clear" });
    this.errorAlertBanner = page.locator(".alert-danger");
  }

  async filterByCategory(category) {
    await this.categoryFilter.selectOption(category);
  }

  async exportReport() {
    const downloadPromise = this.page.waitForEvent("download");
    await this.exportReportButton.click();
    return downloadPromise;
  }

  async expectStatCardsVisible() {
    await expect(this.foodSavedStat).toBeVisible();
    await expect(this.donationsMadeStat).toBeVisible();
    await expect(this.wasteReducedStat).toBeVisible();
  }

  async expectEmptyState() {
    await expect(this.noDataMessage).toBeVisible();
  }
}
