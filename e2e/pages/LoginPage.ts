import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Login page
 */
export class LoginPage extends BasePage {
  // Form elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  // Links
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);

    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole("button", { name: /log\s*in|sign\s*in/i });
    this.errorMessage = page.getByRole("alert");
    this.registerLink = page.getByRole("link", { name: /register|sign\s*up/i });
    this.forgotPasswordLink = page.getByRole("link", { name: /forgot|reset/i });
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
    await this.waitForPageLoad();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginWithRetry(email: string, password: string, maxRetries = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await this.emailInput.fill(email);
      await this.passwordInput.fill(password);
      await this.submitButton.click();

      // Wait a bit for response
      await this.page.waitForTimeout(2000);

      // Check if there's an error message
      const hasError = await this.errorMessage.isVisible().catch(() => false);

      if (!hasError) {
        // No error, login likely succeeded
        return;
      }

      // If error and not last attempt, wait and retry
      if (attempt < maxRetries) {
        // Wait longer between retries (exponential backoff)
        await this.page.waitForTimeout(2000 * attempt);

        // Refresh the page to reset the form
        await this.page.reload();
        await this.waitForPageLoad();
      }
    }
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return this.errorMessage.textContent();
    }
    return null;
  }

  async clickRegisterLink(): Promise<void> {
    await this.registerLink.click();
  }

  async clickForgotPasswordLink(): Promise<void> {
    await this.forgotPasswordLink.click();
  }
}
