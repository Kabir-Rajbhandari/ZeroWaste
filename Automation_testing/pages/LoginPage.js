import { expect } from "@playwright/test";
import { BasePage } from "./BasePage.js";

export class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    this.passwordInput = page.getByRole("textbox", { name: "Password" });
    this.rememberMeCheckbox = page.getByRole("checkbox", {
      name: "Remember Me",
    });
    this.loginButton = page.getByRole("button", { name: /^log ?in$/i });
    this.forgotPasswordLink = page.getByRole("button", {
      name: "Forgot Password?",
    });

    // Login.jsx's post-submit "OTP" stage (2FA). If this is visible after
    // clicking Login, the account has 2FA enabled and the page will
    // intentionally NOT navigate to /dashboard until a code is entered.
    this.otpCodeInput = page.locator("#otpCode");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email, password, { rememberMe = false } = {}) {
    await this.emailInput.click();
    await this.emailInput.fill(email);
    await this.passwordInput.click();
    await this.passwordInput.fill(password);
    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }
    await this.loginButton.click();
  }

  async expectLoggedIn() {
    // Fail fast with a clear, actionable message instead of a generic
    // 5s timeout if the account has 2FA enabled — the automated suite
    // has no way to receive the emailed OTP code, so the TEST_USER
    // account in Automation_testing/.env must have 2FA switched OFF.
    const otpVisible = await this.otpCodeInput.isVisible().catch(() => false);
    if (otpVisible) {
      throw new Error(
        "Login stopped at the OTP/2FA screen instead of reaching /dashboard. " +
          "The TEST_USER account configured in Automation_testing/.env has " +
          "Two-Factor Authentication enabled, and this automated suite cannot " +
          "receive the emailed verification code. Disable 2FA for that account " +
          "(via Settings, or by re-registering with 2FA left off) and re-run.",
      );
    }
    await expect(this.page).toHaveURL(/.*dashboard/, { timeout: 15_000 });
  }

  async expectLoginError() {
    await expect(this.errorAlert).toBeVisible();
  }
}
