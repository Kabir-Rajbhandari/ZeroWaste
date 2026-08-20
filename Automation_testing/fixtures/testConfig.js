export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || "test.user@example.com",
  password: process.env.TEST_USER_PASSWORD || "changeme123",
};

export const TEST_USER_2 = {
  email: process.env.TEST_USER_2_EMAIL || TEST_USER.email,
  password: process.env.TEST_USER_2_PASSWORD || TEST_USER.password,
};

export async function loginAs(page, user = TEST_USER) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(user.email);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password);
  await page.getByRole("button", { name: /^log ?in$/i }).click();
  await page.waitForURL(/dashboard/i, { timeout: 15_000 });
}

/**
 * Generates a unique, disposable email for registration tests (UC1) so
 * repeated test runs never collide with an already-registered account.
 */
export function uniqueEmail(prefix = "zw.qa") {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}.${stamp}.${rand}@example.com`;
}

/**
 * Returns a YYYY-MM-DD expiry date that falls within the app's
 * donation-eligibility window. FoodInventory.jsx's handleConvertToDonation
 * only allows "Convert to Donation" when 0 <= daysUntilExpiry <= 7
 * (see Frontend/src/components/Dashboard/pages/FoodInventory.jsx). Any
 * inventory item a test wants to actually convert to a donation listing
 * MUST use this helper for its expiry date, not a far-future date.
 */
export function donationEligibleExpiryDate(daysFromNow = 3) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

/**
 * Returns a YYYY-MM-DD expiry date far enough out that it is NOT eligible
 * for donation yet — useful for regular "add/edit inventory item" tests
 * that shouldn't accidentally trigger donation-eligibility side effects.
 */
export function farFutureExpiryDate(daysFromNow = 180) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}
