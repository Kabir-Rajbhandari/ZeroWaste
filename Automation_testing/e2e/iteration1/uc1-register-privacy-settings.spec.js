import { test } from "../../fixtures/test.fixtures.js";
import { expect } from "@playwright/test";
import { TEST_USER, uniqueEmail } from "../../fixtures/testConfig.js";

test.describe("UC1 - Register Users and Privacy Settings", () => {
  test.beforeEach(async ({ signupPage }) => {
    await signupPage.goto();
  });

  test("Positive: valid registration proceeds to privacy settings and sends verification email @uc1 @positive", async ({
    signupPage,
  }) => {
    await signupPage.register({
      fullName: "Zero Waste QA",
      email: uniqueEmail(),
      password: "SecurePass123",
      householdSize: 4,
    });

    // Step 2: Privacy & Security Configuration
    await signupPage.configurePrivacy({
      donationPublic: true,
      enableTwoFactor: true,
    });

    // Step 3: verification email sent
    await signupPage.expectVerificationEmailSent();
  });

  test("Positive: user can opt out of public donation visibility and 2FA @uc1 @positive", async ({
    signupPage,
  }) => {
    await signupPage.register({
      fullName: "Private Household",
      email: uniqueEmail(),
      password: "SecurePass123",
    });

    await signupPage.configurePrivacy({
      donationPublic: false,
      enableTwoFactor: false,
    });

    await signupPage.expectVerificationEmailSent();
  });

  test("Negative: rejects a password shorter than 8 characters @uc1 @negative", async ({
    signupPage,
  }) => {
    await signupPage.register({
      fullName: "Weak Password",
      email: uniqueEmail(),
      password: "abc123",
      confirmPassword: "abc123",
    });

    await signupPage.expectFieldError(
      "Password must be at least 8 characters.",
    );
  });

  test("Negative: rejects mismatched password confirmation @uc1 @negative", async ({
    signupPage,
  }) => {
    await signupPage.register({
      fullName: "Mismatch User",
      email: uniqueEmail(),
      password: "SecurePass123",
      confirmPassword: "DifferentPass123",
    });

    await signupPage.expectFieldError("Passwords do not match.");
  });

  test("Negative: rejects an invalid email address @uc1 @negative", async ({
    signupPage,
  }) => {
    await signupPage.register({
      fullName: "Bad Email",
      email: "not-an-email",
      password: "SecurePass123",
    });

    await signupPage.expectFieldError("Enter a valid email address.");
  });

  test("Alternative 3a: rejects registration with an already-registered email @uc1 @negative", async ({
    signupPage,
  }) => {
    await signupPage.register({
      fullName: "Duplicate Account",
      email: TEST_USER.email, // already registered fixture account
      password: "SecurePass123",
    });

    // System prompts a message reminding the user the email is taken.
    await expect(signupPage.errorAlert).toBeVisible();
  });
});
