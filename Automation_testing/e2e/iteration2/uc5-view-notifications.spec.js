import { test } from "../../fixtures/test.fixtures.js";
import { expect } from "@playwright/test";

test.describe("UC5 - View Centralised Notification List", () => {
  test.describe("Using TEST_USER", () => {
    test.beforeEach(async ({ authedPage, dashboardPage }) => {
      await dashboardPage.goToNotifications();
    });

    test("Positive: View Centralised Notification List Sorted by Timestamp @uc5 @positive", async ({
      notificationsPage,
    }) => {
      await expect(notificationsPage.heading).toBeVisible();
      await expect(notificationsPage.loadingMessage).toBeHidden({
        timeout: 10_000,
      });

      // Either real notifications render, or the explicit empty state
      // does — never a blank panel.
      await expect(
        notificationsPage.notificationCardsByRole
          .first()
          .or(notificationsPage.emptyStateText),
      ).toBeVisible();

      const count = await notificationsPage.notificationCardsByRole.count();
      test.skip(
        count < 2,
        "Need at least 2 notifications to verify sort order in this environment.",
      );

      // Notifications.jsx sorts newest-first by createdAt before
      // rendering — verify that ordering holds using each card's visible
      // "time ago" badge, converted to an approximate minutes-ago rank.
      const ranks = await notificationsPage.getRelativeAgeRanks();
      for (let i = 1; i < ranks.length; i += 1) {
        expect(
          ranks[i],
          `Notification #${i + 1} appears newer than #${i} — list is not sorted newest-first.`,
        ).toBeGreaterThanOrEqual(ranks[i - 1]);
      }
    });

    test("Positive: Notification Click Opens Related Screen and Marks as Read @uc5 @positive", async ({
      notificationsPage,
      dashboardPage,
    }) => {
      await expect(notificationsPage.loadingMessage).toBeHidden({
        timeout: 10_000,
      });

      const count = await notificationsPage.notificationCardsByRole.count();
      test.skip(
        count === 0,
        "No notifications available to open in this environment.",
      );

      const beforeBg = await notificationsPage.isUnread(0);

      // Actor Action: clicking a notification. Notifications.jsx marks it
      // read via the API immediately, then (if the notification type maps
      // to a destination) navigates the dashboard to that related screen
      // — e.g. an expiry alert opens Food Inventory, a new donation
      // request opens Browse Food Items, etc.
      await notificationsPage.openNotification(0);
      await expect(notificationsPage.page.locator(".alert-danger")).toHaveCount(
        0,
      );

      // Return to Notifications (no-op if the click had no destination
      // and we never left) to confirm the item is now recorded as read.
      await dashboardPage.goToNotifications();
      await expect(notificationsPage.heading).toBeVisible();
      const afterBg = await notificationsPage.isUnread(0);

      expect(
        afterBg,
        "Notification card background did not change after clicking it — it may not have been marked as read.",
      ).not.toBe(beforeBg);
    });
  });

  test.describe("Using TEST_USER_2 (fresh / low-activity account)", () => {
    test.beforeEach(async ({ authedPage2, dashboardPage }) => {
      await dashboardPage.goToNotifications();
    });

    test("Negative: Notification Panel Empty State for New User @uc5 @negative", async ({
      notificationsPage,
    }) => {
      // A brand-new / never-active account (TEST_USER_2) has generated no
      // notifications yet, so the panel must show the explicit empty
      // state rather than a spinner, an error, or stale data.
      await expect(notificationsPage.heading).toBeVisible();
      await expect(notificationsPage.loadingMessage).toBeHidden({
        timeout: 10_000,
      });
      await expect(notificationsPage.page.locator(".alert-danger")).toHaveCount(
        0,
      );
      await notificationsPage.expectEmptyState();
    });
  });

  test("Negative: Unauthenticated User Cannot Access Notification Panel @uc5 @negative", async ({
    page,
    loginPage,
  }) => {
    await page.goto("/dashboard");

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Notification" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Notifications" }),
    ).toHaveCount(0);
  });
});
