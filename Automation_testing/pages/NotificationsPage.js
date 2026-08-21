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

    // The relative "X minutes/hours/days ago" badge rendered on each card
    // (Notifications.jsx's timeAgo() helper) — used to sanity-check
    // newest-first ordering without needing a data-testid/exact timestamp.
    this.timestampBadges = this.notificationCardsByRole.locator(
      ".rounded-2.px-3.py-1.small.fw-semibold",
    );
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

  /** Whether the nth notification card renders as unread (highlighted/bold background). */
  async isUnread(index = 0) {
    const bg = await this.notificationCardsByRole
      .nth(index)
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    // Notifications.jsx: unread cards use colors.showcase_green,
    // read cards use colors.authBg — different, non-transparent colors,
    // so a straightforward computed-style diff is reliable here.
    return bg;
  }

  /**
   * Converts each visible "X minutes/hours/days ago" / "Just now" badge
   * into an approximate "minutes ago" number so newest-first ordering can
   * be asserted without needing exact timestamps. Absolute dates (7+ days
   * old) sort after everything else, oldest-last.
   */
  async getRelativeAgeRanks() {
    const texts = await this.timestampBadges.allTextContents();
    return texts.map((raw) => {
      const text = raw.trim().toLowerCase();
      if (text === "just now") return 0;
      const minuteMatch = text.match(/^(\d+)\s+minute/);
      if (minuteMatch) return Number(minuteMatch[1]);
      const hourMatch = text.match(/^(\d+)\s+hour/);
      if (hourMatch) return Number(hourMatch[1]) * 60;
      const dayMatch = text.match(/^(\d+)\s+day/);
      if (dayMatch) return Number(dayMatch[1]) * 60 * 24;
      // Absolute "DD Mon YYYY" fallback for anything 7+ days old.
      const parsed = Date.parse(raw.trim());
      if (!Number.isNaN(parsed)) {
        return Math.round((Date.now() - parsed) / 60000);
      }
      return Number.POSITIVE_INFINITY;
    });
  }
}
