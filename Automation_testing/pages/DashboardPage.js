import { expect } from "@playwright/test";
import { BasePage } from "./BasePage.js";

export class DashboardPage extends BasePage {
  constructor(page) {
    super(page);

    this.heading = page.getByRole("heading", { name: /dashboard/i });

    // Sidebar nav (DashboardSidebar.jsx renders inside a <nav>). Scoped to
    // that <nav> because the Dashboard's main "quick action" buttons reuse
    // the exact same labels (e.g. a "Meal Planner" shortcut card), which
    // would otherwise match twice and throw a Playwright strict-mode error.
    this.sidebarNav = page.locator("nav").first();

    this.dashboardNav = this.sidebarNav.getByRole("button", {
      name: "Dashboard",
      exact: true,
    });
    this.foodInventoryNav = this.sidebarNav.getByRole("button", {
      name: "Food Inventory",
      exact: true,
    });
    this.donationListingNav = this.sidebarNav.getByRole("button", {
      name: "Donation Listing",
      exact: true,
    });
    this.browseFoodNav = this.sidebarNav.getByRole("button", {
      name: "Browse Food Item",
      exact: true,
    });
    this.expiryAlertsNav = this.sidebarNav.getByRole("button", {
      name: "Expiry Alerts",
      exact: true,
    });
    this.mealPlannerNav = this.sidebarNav.getByRole("button", {
      name: "Meal Planner",
      exact: true,
    });
    this.analyticsNav = this.sidebarNav.getByRole("button", {
      name: "Analytics",
      exact: true,
    });
    this.settingsNav = this.sidebarNav.getByRole("button", {
      name: "Settings",
      exact: true,
    });

    // Top bar
    this.notificationBellButton = page.getByRole("button", {
      name: "Notifications",
    });
  }

  async expectOnDashboard() {
    await expect(this.page).toHaveURL(/.*dashboard/);
  }

  async goToInventory() {
    await this.foodInventoryNav.click();
  }

  async goToBrowseFoodItems() {
    await this.browseFoodNav.click();
  }

  async goToMealPlanner() {
    await this.mealPlannerNav.click();
  }

  async goToAnalytics() {
    await this.analyticsNav.click();
  }

  async goToNotifications() {
    await this.notificationBellButton.click();
  }
}
