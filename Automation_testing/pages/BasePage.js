export class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  /** Any inline `alert-danger` banner rendered by the app (auth forms, inventory, etc). */
  get errorAlert() {
    return this.page.locator(".alert-danger").first();
  }

  /** Any inline `alert-success` / `alert-info` banner rendered by the app. */
  get successAlert() {
    return this.page.locator(".alert-success, .alert-info").first();
  }

  async gotoPath(path) {
    await this.page.goto(path);
  }

  /** Sidebar / header navigation is shared across all dashboard sub-pages. */
  async openSidebarItem(label) {
    await this.page.getByRole("button", { name: label, exact: true }).click();
  }
}
