import { test, expect, TEST_USER } from "./fixtures/test-fixtures";

/**
 * Authentication E2E Tests
 * @see test-plan.md Section 4.1
 */

test.describe("Authentication", () => {
  test.describe("User Registration", () => {
    // AUTH-001
    test("should register with valid email and password", async ({ registerPage, page }) => {
      await registerPage.goto();

      const testEmail = `test-${Date.now()}@example.com`;
      await registerPage.register(testEmail, "SecurePassword123!");

      // Should show success or redirect to quiz/dashboard
      await expect(
        page.getByText(/success|check your email|verification/i).or(page.locator('text="Quiz"'))
      ).toBeVisible({ timeout: 10000 });
    });

    // AUTH-002
    test("should show error for existing email", async ({ registerPage }) => {
      await registerPage.goto();

      // Use a known existing email (from test seed data or previous test)
      await registerPage.register("existing@example.com", "SecurePassword123!");

      const error = await registerPage.getErrorMessage();
      expect(error?.toLowerCase()).toContain("already");
    });

    // AUTH-003
    test("should show validation error for invalid email format", async ({ registerPage, page }) => {
      await registerPage.goto();

      await registerPage.emailInput.fill("invalid-email");
      await registerPage.passwordInput.fill("SecurePassword123!");
      await registerPage.submitButton.click();

      // Check for HTML5 validation or custom error
      const emailInput = registerPage.emailInput;
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);

      expect(validationMessage || (await registerPage.getErrorMessage())).toBeTruthy();
    });

    // AUTH-004
    test("should show validation error for password less than 8 characters", async ({ registerPage }) => {
      await registerPage.goto();

      await registerPage.register("test@example.com", "short");

      const error = await registerPage.getErrorMessage();
      expect(error?.toLowerCase()).toMatch(/password|character|length|minimum/i);
    });

    // AUTH-005
    test("should show validation errors for empty fields", async ({ registerPage }) => {
      await registerPage.goto();

      await registerPage.submitButton.click();

      // Either HTML5 validation or form prevents submission
      const emailInput = registerPage.emailInput;
      const isRequired = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valueMissing);

      expect(isRequired || (await registerPage.getErrorMessage())).toBeTruthy();
    });
  });

  test.describe("User Login", () => {
    // AUTH-010
    test("should login with valid credentials and redirect to dashboard", async ({ loginPage, page }) => {
      await loginPage.goto();

      // Use test credentials from .env.test
      const testEmail = TEST_USER.email;
      const testPassword = TEST_USER.password;

      await loginPage.login(testEmail, testPassword);

      // Should redirect to dashboard
      await expect(page).toHaveURL(/dashboard|quiz/, { timeout: 10000 });
    });

    // AUTH-011
    test("should show error for invalid password", async ({ loginPage }) => {
      await loginPage.goto();

      await loginPage.login("test@example.com", "WrongPassword123!");

      const error = await loginPage.getErrorMessage();
      expect(error?.toLowerCase()).toMatch(/invalid|incorrect|wrong/i);
    });

    // AUTH-012
    test("should show error for non-existent email", async ({ loginPage }) => {
      await loginPage.goto();

      await loginPage.login("nonexistent@example.com", "SomePassword123!");

      const error = await loginPage.getErrorMessage();
      expect(error?.toLowerCase()).toMatch(/invalid|incorrect|not found/i);
    });

    // AUTH-013
    test("should redirect to dashboard if already authenticated", async ({ loginPage, page }) => {
      // First login
      await loginPage.goto();
      const testEmail = TEST_USER.email;
      const testPassword = TEST_USER.password;
      await loginPage.login(testEmail, testPassword);

      // Wait for redirect
      await page.waitForURL(/dashboard|quiz/, { timeout: 10000 });

      // Try to navigate to login again
      await page.goto("/login");

      // Should be redirected back to dashboard
      await expect(page).toHaveURL(/dashboard|quiz/, { timeout: 5000 });
    });

    // AUTH-014
    test("should maintain session after page reload", async ({ loginPage, page, dashboardPage }) => {
      await loginPage.goto();

      const testEmail = TEST_USER.email;
      const testPassword = TEST_USER.password;

      await loginPage.login(testEmail, testPassword);
      await page.waitForURL(/dashboard/, { timeout: 10000 });

      // Reload the page
      await page.reload();

      // Should still be on dashboard
      await expect(page).toHaveURL(/dashboard/);

      // Dashboard should show user content
      const greeting = await dashboardPage.getUserGreeting();
      expect(greeting).toBeTruthy();
    });
  });

  test.describe("Password Reset", () => {
    // AUTH-020
    test("should show success message when requesting reset with valid email", async ({ passwordResetPage }) => {
      await passwordResetPage.goto();

      await passwordResetPage.requestPasswordReset("test@example.com");

      const isSuccess = await passwordResetPage.isSuccessMessageVisible();
      expect(isSuccess).toBe(true);
    });

    // AUTH-021
    test("should show success message for non-existent email (security)", async ({ passwordResetPage }) => {
      await passwordResetPage.goto();

      await passwordResetPage.requestPasswordReset("nonexistent@example.com");

      // For security, should show same success message
      const isSuccess = await passwordResetPage.isSuccessMessageVisible();
      expect(isSuccess).toBe(true);
    });
  });

  test.describe("Logout", () => {
    test("should logout successfully and redirect to home", async ({ loginPage, dashboardPage, page }) => {
      // Login first
      await loginPage.goto();
      const testEmail = TEST_USER.email;
      const testPassword = TEST_USER.password;
      await loginPage.login(testEmail, testPassword);

      await page.waitForURL(/dashboard/, { timeout: 10000 });

      // Logout
      await dashboardPage.logout();

      // Should redirect to home or login
      await expect(page).toHaveURL(/^\/$|login|home/, { timeout: 5000 });
    });

    test("should not access protected pages after logout", async ({ loginPage, dashboardPage, page }) => {
      // Login
      await loginPage.goto();
      const testEmail = TEST_USER.email;
      const testPassword = TEST_USER.password;
      await loginPage.login(testEmail, testPassword);
      await page.waitForURL(/dashboard/, { timeout: 10000 });

      // Logout
      await dashboardPage.logout();
      await page.waitForURL(/^\/$|login/, { timeout: 5000 });

      // Try to access dashboard directly
      await page.goto("/dashboard");

      // Should be redirected to login
      await expect(page).toHaveURL(/login/, { timeout: 5000 });
    });
  });
});
