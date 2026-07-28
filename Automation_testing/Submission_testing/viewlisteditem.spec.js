import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.locator('div').filter({ hasText: 'Back to homeWelcome BackLog' }).nth(3).click();
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('zerowaste.official2026@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('12345678');
  await page.getByRole('checkbox', { name: 'Remember Me' }).check();
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Browse Food Item' }).click();
  await page.getByRole('button', { name: 'View Details' }).nth(4).click();
   await page.locator('body').press('ControlOrMeta+z');
  await page.locator('body').press('ControlOrMeta+z');
  await page.locator('body').press('ControlOrMeta+z');
  await page.getByRole('cell', { name: 'Quantity' }).click();
  await page.getByRole('cell', { name: 'Category' }).click();
  await page.getByRole('cell', { name: 'Expiry Date' }).click();
  await page.getByRole('cell', { name: 'Pickup Location' }).click();
  await page.getByRole('cell', { name: 'Available Time' }).click();
  await page.getByRole('button', { name: 'Contact Donor' }).click();
  await page.getByText('Contact:').click();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Dashboard' }).click();
});