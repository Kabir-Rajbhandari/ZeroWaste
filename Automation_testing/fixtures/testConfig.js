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
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole("button", { name: /^log ?in$/i }).click();
  await page.waitForURL(/dashboard/i, { timeout: 15_000 });
}
