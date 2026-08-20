import { expect } from "@playwright/test";
import { BasePage } from "./BasePage.js";

export class SignupPage extends BasePage {
  constructor(page) {
    super(page);

    // Step 1: registration form
    this.fullNameInput = page.getByLabel("Full Name:");
    this.emailInput = page.getByLabel("Email:");
    this.householdSizeInput = page.getByLabel("Household Size (optional):");
    this.passwordInput = page.getByLabel("Password:", { exact: true });
    this.confirmPasswordInput = page.getByLabel("Confirm Password:");
    this.registerButton = page.getByRole("button", { name: "Register" });

    // Step 2: privacy & security configuration
    this.privacyHeading = page.getByRole("heading", {
      name: "Privacy & Security",
    });
    this.donationPublicCheckbox = page.locator("#donationPublic");
    this.enableTwoFactorCheckbox = page.locator("#enableTwoFactor");
    this.continueButton = page.getByRole("button", { name: "Continue" });

    // Step 3: check-your-email confirmation
    this.checkEmailHeading = page.getByRole("heading", {
      name: "Check Your Email",
    });
  }

  async goto() {
    await this.page.goto("/signup");
  }

  /**
   * The registration <form> uses a native type="email" input with no
   * `noValidate`, so the browser blocks submission of malformed emails
   * before React's own validate() ever runs. That's correct behaviour for
   * real users, but it means an automated negative test for "invalid
   * email" needs to bypass the *browser's* constraint validation in order
   * to reach and assert on the *app's* own validation message.
   */
  async _disableNativeValidation() {
    await this.page
      .locator("form")
      .first()
      .evaluate((form) => {
        form.setAttribute("novalidate", "true");
      });
  }

  /** Fills and submits the registration form (UC1 step 1). */
  async register({
    fullName,
    email,
    password,
    confirmPassword = password,
    householdSize,
  }) {
    await this._disableNativeValidation();
    await this.fullNameInput.fill(fullName);
    await this.emailInput.fill(email);
    if (householdSize !== undefined) {
      await this.householdSizeInput.fill(String(householdSize));
    }
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.registerButton.click();
  }

  /** Confirms/updates privacy settings and continues (UC1 step 2). */
  async configurePrivacy({ donationPublic, enableTwoFactor } = {}) {
    await expect(this.privacyHeading).toBeVisible();

    if (donationPublic === false) {
      await this.donationPublicCheckbox.uncheck();
    } else if (donationPublic === true) {
      await this.donationPublicCheckbox.check();
    }

    if (enableTwoFactor === true) {
      await this.enableTwoFactorCheckbox.check();
    } else if (enableTwoFactor === false) {
      await this.enableTwoFactorCheckbox.uncheck();
    }

    await this.continueButton.click();
  }

  async expectVerificationEmailSent() {
    await expect(this.checkEmailHeading).toBeVisible();
  }

  async expectFieldError(message) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
