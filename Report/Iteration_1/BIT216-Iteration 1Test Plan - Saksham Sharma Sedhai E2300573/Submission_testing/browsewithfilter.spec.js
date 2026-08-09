import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('zerowaste.official2026@gmail.com');
  await page.getByRole('textbox', { name: 'Email' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('12345678');
  await page.getByRole('checkbox', { name: 'Remember Me' }).check();
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Browse Food Item' }).click();
  await page.getByRole('combobox').selectOption('Fruits');
  await page.getByRole('img', { name: 'MAsssuuu' }).click();
  await page.locator('div').filter({ hasText: /^MAsssuuu45 Kg - FruitsExpires 08 July 2026View Details$/ }).nth(1).click();
  await page.locator('div').filter({ hasText: /^Apple \(Public\)0\.02 Kg - FruitsExpires 24 July 2026View Details$/ }).nth(1).click();
  await page.locator('div').filter({ hasText: /^Strawberry Pie1 Kg - FruitsExpires 25 July 2026View Details$/ }).nth(1).click();
  await page.locator('div').filter({ hasText: /^Apple3 Kg - FruitsExpires 30 July 2026View Details$/ }).nth(1).click();
  await page.getByRole('combobox').selectOption('Vegetable');
  await page.locator('div').filter({ hasText: /^Apple6 Kg - VegetableExpires 23 July 2026View Details$/ }).nth(3).click();
  await page.getByRole('combobox').selectOption('Meat');
  await page.locator('div').filter({ hasText: /^Apple5 Ltr - MeatExpires 25 July 2026View Details$/ }).nth(1).click();
  await page.locator('div').filter({ hasText: /^Chicken5 Kg - MeatExpires 28 July 2026Request PendingView Details$/ }).nth(1).click();
});