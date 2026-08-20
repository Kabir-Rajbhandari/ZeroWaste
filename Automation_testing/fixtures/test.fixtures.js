import { test as base, expect } from "@playwright/test";
import { TEST_USER } from "./testConfig.js";

import { LandingPage } from "../pages/LandingPage.js";
import { LoginPage } from "../pages/LoginPage.js";
import { SignupPage } from "../pages/SignupPage.js";
import { DashboardPage } from "../pages/DashboardPage.js";
import { InventoryPage } from "../pages/InventoryPage.js";
import { BrowsePage } from "../pages/BrowsePage.js";
import { AnalyticsPage } from "../pages/AnalyticsPage.js";
import { NotificationsPage } from "../pages/NotificationsPage.js";
import { MealPlannerPage } from "../pages/MealPlannerPage.js";

export const test = base.extend({
  landingPage: async ({ page }, use) => use(new LandingPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  signupPage: async ({ page }, use) => use(new SignupPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  inventoryPage: async ({ page }, use) => use(new InventoryPage(page)),
  browsePage: async ({ page }, use) => use(new BrowsePage(page)),
  analyticsPage: async ({ page }, use) => use(new AnalyticsPage(page)),
  notificationsPage: async ({ page }, use) => use(new NotificationsPage(page)),
  mealPlannerPage: async ({ page }, use) => use(new MealPlannerPage(page)),

  /**
   * A page that is already logged in as TEST_USER and sitting on
   * /dashboard when the test body starts. Use this for every spec that
   * doesn't specifically need to exercise the login flow itself.
   */
  authedPage: async ({ page, loginPage }, use) => {
    await loginPage.goto();
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await loginPage.expectLoggedIn();
    await use(page);
  },
});

export { expect };
