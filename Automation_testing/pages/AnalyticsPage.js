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

    // Stat cards (StatCard label prop). NOTE: "Food Saved" text appears
    // TWICE on this page — once as the stat-card label, and again as the
    // heading of the "Food Saved" breakdown chart further down — so a bare
    // getByText("Food Saved") is a Playwright strict-mode violation (it
    // resolves to 2 elements) and throws on any action/assertion. The stat
    // card is the first "Food Saved" text in DOM order.
    this.foodSavedStat = page.getByText("Food Saved").first();
    this.donationsMadeStat = page.getByText("Donations Made");
    this.wasteReducedStat = page.getByText("Waste Reduced");

    this.noDataMessage = page.getByText("No food-saving data yet");
    this.loadingMessage = page.getByText("Loading analytics…");
    // DateRangePicker's inline "clear" link only renders once a custom
    // range is selected — see clearCustomDateRange().
    this.clearDateRangeButton = page.getByRole("button", { name: "clear" });
    this.datePickerButton = page.locator("#btn-date-picker");
    this.dateRangeDialog = page.getByRole("dialog");
    this.awaitingRangeMessage = page.getByText(
      "Pick a start and end date to view analytics for your selected range.",
    );
    this.errorAlertBanner = page.locator(".alert-danger");
  }

  async goto() {
    // Analytics has no dedicated URL — it's a Dashboard sub-view reached
    // via the sidebar (see DashboardPage.goToAnalytics()). This helper
    // exists only for readability in specs that already have a
    // dashboardPage available; it does not perform navigation itself.
  }

  /** Opens the date-range picker dropdown (idempotent: no-ops if already open). */
  async openDateRangePicker() {
    const alreadyOpen = await this.dateRangeDialog
      .isVisible()
      .catch(() => false);
    if (!alreadyOpen) {
      await this.datePickerButton.click();
    }
    await expect(this.dateRangeDialog).toBeVisible();
  }

  /** Picks one of DateRangePicker's named presets, e.g. "This month", "Last month". */
  async selectDateRangePreset(label) {
    await this.openDateRangePicker();
    await this.dateRangeDialog
      .getByRole("button", { name: label, exact: true })
      .click();
    await expect(this.dateRangeDialog).toBeHidden();
  }

  async clearDateRange() {
    await expect(this.clearDateRangeButton).toBeVisible();
    await this.clearDateRangeButton.click();
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
