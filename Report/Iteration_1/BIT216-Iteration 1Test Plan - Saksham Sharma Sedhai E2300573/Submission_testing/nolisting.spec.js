import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('zerowaste.official2026@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('12345678');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Browse Food Item' }).click();
  await page.getByRole('combobox').selectOption('Fruits');
  await page.getByRole('combobox').selectOption('Vegetable');
  await page.getByRole('combobox').selectOption('Dairy');
  await page.getByRole('combobox').selectOption('Meat');
  await page.getByRole('combobox').selectOption('Other');
  await page.getByText('No donated items are').click();
  await page.getByText('No donated items are').click();
  await page.getByText('No donated items are').click();
  await page.getByText('No donated items are').click();
});