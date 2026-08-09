import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('zerowaste.official2026@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('12345678');
  await page.getByText('Remember Me').click();
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Food Inventory' }).click();
  await page.getByRole('button', { name: 'Add Food Items' }).click();
  await page.getByRole('textbox', { name: 'Apple' }).click();
  await page.getByRole('textbox', { name: 'Apple' }).fill('Mango');
  await page.getByText('Food NameCategorySelect').click();
  await page.locator('form').click();
  await page.getByRole('button', { name: 'Save Item' }).click();
  await page.getByText('Please select a category.').click();
  await page.getByRole('button', { name: 'Save Item' }).click();
  await page.getByText('Please select a category.').dblclick();
  await page.getByText('Please select a category.').dblclick();
});