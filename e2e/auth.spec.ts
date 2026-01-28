import { test, expect, TEST_USER } from "./fixtures/test-fixtures";

/**
 * Authentication E2E Tests
 * @see test-plan.md Section 4.1
 */

test.describe("Authentication", () => {
  test.describe("User Registration", () => {
    // AUTH-001
    // Note: This test may fail due to Supabase email rate limits
    // To run reliably, increase rate limits in Supabase dashboard or use a dedicated test project
    test.skip("should register with valid email and password", async ({ registerPage, page }) => {
      await registerPage.goto();

      const testEmail = `test-${Date.now()}@example.com`;
      await registerPage.register(testEmail, "SecurePassword123!");

      // Should show success message or redirect to dashboard
      await expect(
        page.getByText(/account created|redirecting to your dashboard/i).or(page.getByTestId("register-success"))
      ).toBeVisible({ timeout: 10000 });

      // Should eventually redirect to dashboard
      await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
    });

    // AUTH-002
    // Note: This test may fail due to Supabase email rate limits
    test.skip("should show error for existing email", async ({ registerPage, page }) => {
      await registerPage.goto();

      // Use the test user email which already exists
      const existingEmail = process.env.E2E_USERNAME || "test_user@example.com";
      await registerPage.register(existingEmail, "SecurePassword123!");

      // Should show error message about existing email
      await expect(
        page.getByRole("alert").or(page.getByTestId("register-error"))
      ).toBeVisible({ timeout: 5000 });

      const error = await registerPage.getErrorMessage();
      expect(error?.toLowerCase()).toMatch(/already|exists/i);
    });

    // AUTH-003
    test("should show validation error for invalid email format", async ({ registerPage }) => {
      await registerPage.goto();

      await registerPage.emailInput.fill("invalid-email");
      await registerPage.passwordInput.fill("SecurePassword123!");
      // Blur to trigger validation
      await registerPage.passwordInput.blur();

      // Submit button should be disabled with invalid email
      await expect(registerPage.submitButton).toBeDisabled();

      // Check for aria-invalid on email input
      await expect(registerPage.emailInput).toHaveAttribute("aria-invalid", "true");
    });

    // AUTH-004
    test("should show validation error for password less than 8 characters", async ({ registerPage, page }) => {
      await registerPage.goto();

      await registerPage.emailInput.fill("test@example.com");
      await registerPage.passwordInput.fill("short");
      // Blur to trigger validation
      await registerPage.passwordInput.blur();

      // Submit button should be disabled with short password
      await expect(registerPage.submitButton).toBeDisabled();

      // Check for password error message
      const passwordError = page.getByText(/at least 8 characters/i);
      await expect(passwordError).toBeVisible();
    });

    // AUTH-005
    test("should show validation errors for empty fields", async ({ registerPage }) => {
      await registerPage.goto();

      // With empty fields, submit button should be disabled
      await expect(registerPage.submitButton).toBeDisabled();

      // Fields should be required
      await expect(registerPage.emailInput).toHaveAttribute("required", "");
      await expect(registerPage.passwordInput).toHaveAttribute("required", "");
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
    test("should show error for invalid password", async ({ loginPage, page }) => {
      await loginPage.goto();

      await loginPage.login("test@example.com", "WrongPassword123!");

      // Wait for error message to appear
      await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });
      const error = await loginPage.getErrorMessage();
      expect(error?.toLowerCase()).toMatch(/invalid|incorrect|wrong/i);
    });

    // AUTH-012
    test("should show error for non-existent email", async ({ loginPage, page }) => {
      await loginPage.goto();

      await loginPage.login("nonexistent@example.com", "SomePassword123!");

      // Wait for error message to appear
      await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });
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
    test("should show success message when requesting reset with valid email", async ({ passwordResetPage, page }) => {
      await passwordResetPage.goto();

      await passwordResetPage.requestPasswordReset("test@example.com");

      // Wait for success message
      await expect(page.getByRole("status")).toBeVisible({ timeout: 5000 });
      const isSuccess = await passwordResetPage.isSuccessMessageVisible();
      expect(isSuccess).toBe(true);
    });

    // AUTH-021
    test("should show success message for non-existent email (security)", async ({ passwordResetPage, page }) => {
      await passwordResetPage.goto();

      await passwordResetPage.requestPasswordReset("nonexistent@example.com");

      // For security, should show same success message
      await expect(page.getByRole("status")).toBeVisible({ timeout: 5000 });
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

      // Should redirect to home (/) or login page
      // Wait for navigation to complete
      await page.waitForLoadState("networkidle");
      const url = page.url();
      expect(url.endsWith("/") || url.includes("login")).toBe(true);
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
      // Wait for navigation to complete
      await page.waitForLoadState("networkidle");

      // Try to access dashboard directly
      await page.goto("/dashboard");

      // Should be redirected to login
      await expect(page).toHaveURL(/login/, { timeout: 5000 });
    });
  });
});
