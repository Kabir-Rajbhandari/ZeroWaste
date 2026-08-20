import { BasePage } from "./BasePage.js";

export class LandingPage extends BasePage {
  constructor(page) {
    super(page);
    this.nav = page.getByRole("navigation");
    this.loginButton = page.getByRole("button", { name: "Login" });
    this.getStartedButton = page.getByRole("button", { name: /get started/i });
  }

  async goto() {
    await this.page.goto("/");
  }

  /** Walks every public nav link + the Privacy/Terms footer pages and back. */
  async visitAllPublicPages() {
    await this.nav.getByRole("link", { name: "How it works" }).click();
    await this.nav.getByRole("link", { name: "Features" }).click();
    await this.nav.getByRole("link", { name: "About" }).click();
    await this.nav.getByRole("link", { name: "Contact" }).click();

    await this.page.getByRole("button", { name: "Privacy Policy" }).click();
    await this.page.getByRole("button", { name: "Back to home" }).click();

    await this.page.getByRole("button", { name: "Terms of Service" }).click();
    await this.page.getByRole("button", { name: "Back to home" }).click();
  }

  async openLogin() {
    await this.loginButton.click();
  }

  async openSignup() {
    await this.getStartedButton.click();
  }
}
