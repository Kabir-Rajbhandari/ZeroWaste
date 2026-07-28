import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {

  // Visit the site hosted
  await page.goto('http://localhost:5173/');

  // Navigate and visit all the pages in the system
  await page.getByRole('navigation').getByRole('link', { name: 'How it works' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Features' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'About' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Contact' }).click();
  await page.getByRole('button', { name: 'Privacy Policy' }).click();
  await page.getByRole('button', { name: 'Back to home' }).click();
  await page.getByRole('button', { name: 'Terms of Service' }).click();
  await page.getByRole('button', { name: 'Back to home' }).click();

  // Click the login button
  await page.getByRole('button', { name: 'Login' }).click();

  // Click the email
  await page.getByRole('textbox', { name: 'Email' }).click();

  // Enter the email
  await page.getByRole('textbox', { name: 'Email' }).fill('zerowaste.official2026@gmail.com');

  // Click on password
  await page.getByRole('textbox', { name: 'Password' }).click();

  // Enter the password
  await page.getByRole('textbox', { name: 'Password' }).fill('12345678');

  // Click the login button
  await page.getByRole('button', { name: 'Login' }).click();

  // System logs in — assert redirect to dashboard
  await expect(page).toHaveURL(/.*dashboard/);

  // Step 2: Refresh the browser after redirect assertion
  await page.reload();

  // Step 3: Assert the dashboard header element is present
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

});