import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("http://localhost:5173/");
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill("zerowaste.official");
  await page.getByRole("textbox", { name: "Email" }).click();
  await page
    .getByRole("textbox", { name: "Email" })
    .fill("zerowaste.official2026@gmail.com");
  await page.getByRole("textbox", { name: "Password" }).click();
  await page.getByRole("textbox", { name: "Password" }).fill("12345678");
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByRole("button", { name: "Food Inventory" }).click();
  await page.getByRole("button", { name: "Add Food Items" }).click();
  await page.getByRole("textbox", { name: "Apple" }).click({
    modifiers: ["Shift"],
  });
  await page.getByRole("textbox", { name: "Apple" }).click();
  await page.getByRole("textbox", { name: "Apple" }).fill("A");
  await page.getByRole("textbox", { name: "Apple" }).click({
    modifiers: ["Shift"],
  });
  await page.getByRole("textbox", { name: "Apple" }).fill("Apple");
  await page.locator('select[name="category"]').selectOption("Vegetable");
  await page.getByText("Storage", { exact: true }).click();
  await page.getByPlaceholder("2").click();
  await page.getByPlaceholder("2").fill("6");
  await page.locator('input[name="expiryDate"]').fill("2026-07-26");
  await page.locator('select[name="storage"]').selectOption("Fridge");
  await page.getByRole("button", { name: "Save Item" }).click();
});
