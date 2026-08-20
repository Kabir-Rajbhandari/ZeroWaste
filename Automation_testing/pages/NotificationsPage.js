import { expect } from "@playwright/test";
import { BasePage } from "./BasePage.js";

const TABS = ["All", "Alerts", "Donations", "Reminders", "System"];

export class NotificationsPage extends BasePage {
  constructor(page) {
    super(page);

    this.heading = page.getByRole("heading", { name: "Notification" });
    this.markAllReadButton = page.getByRole("button", {
      name: "Mark all as read",
    });
    // Notification rows are <div role="button" class="notification-card">.
    this.notificationCardsByRole = page.locator(
      '[role="button"].notification-card',
    );
    this.emptyStateText = page.getByText("No notifications here yet.");
    this.loadingMessage = page.getByText("Loading notifications…");

    this.removeButtons = page.getByRole("button", {
      name: "Remove notification",
    });
    this.acceptButton = page.getByRole("button", { name: "Accept" });
    this.declineButton = page.getByRole("button", { name: "Decline" });

    this.prevPageButton = page.getByRole("button", { name: "Previous page" });
    this.nextPageButton = page.getByRole("button", { name: "Next page" });
  }

  tab(name) {
    if (!TABS.includes(name)) {
      throw new Error(
        `Unknown notifications tab "${name}". Expected one of: ${TABS.join(", ")}`,
      );
    }
    return this.page.getByRole("button", { name, exact: true });
  }

  async filterBy(tabName) {
    await this.tab(tabName).click();
  }

  async markAllRead() {
    await this.markAllReadButton.click();
  }

  async openNotification(index = 0) {
    await this.notificationCardsByRole.nth(index).click();
  }

  async removeNotification(index = 0) {
    await this.removeButtons.nth(index).click();
  }

  async expectEmptyState() {
    await expect(this.emptyStateText).toBeVisible();
  }

  async expectAtLeastOneNotification() {
    await expect(this.notificationCardsByRole.first()).toBeVisible();
  }
}
