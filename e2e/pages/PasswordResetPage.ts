import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Password Reset page
 */
export class PasswordResetPage extends BasePage {
  // Request reset form
  readonly emailInput: Locator;
  readonly requestResetButton: Locator;

  // Update password form (after clicking reset link)
  readonly newPasswordInput: Locator;
  readonly updatePasswordButton: Locator;

  // Messages
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);

    this.emailInput = page.getByLabel(/email/i);
    this.requestResetButton = page.getByRole("button", { name: /send reset link/i });

    this.newPasswordInput = page.getByLabel(/new password/i);
    this.updatePasswordButton = page.getByRole("button", { name: /update password/i });

    // Success message uses role="status"
    this.successMessage = page.getByRole("status");
    this.errorMessage = page.getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.page.goto("/reset-password");
    await this.waitForPageLoad();
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.requestResetButton.click();
  }

  async updatePassword(newPassword: string): Promise<void> {
    await this.newPasswordInput.fill(newPassword);
    await this.updatePasswordButton.click();
  }

  async isSuccessMessageVisible(): Promise<boolean> {
    return this.successMessage.isVisible();
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return this.errorMessage.textContent();
    }
    return null;
  }

  async getSuccessMessage(): Promise<string | null> {
    if (await this.successMessage.isVisible()) {
      return this.successMessage.textContent();
    }
    return null;
  }
}
