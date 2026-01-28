import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Register page
 */
export class RegisterPage extends BasePage {
  // Form elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  // Password strength indicator
  readonly passwordStrength: Locator;

  // Links
  readonly loginLink: Locator;

  constructor(page: Page) {
    super(page);

    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole("button", { name: /create account/i });
    this.errorMessage = page.getByRole("alert");
    this.successMessage = page.getByRole("status");
    this.passwordStrength = page.getByText(/strength:/i);
    this.loginLink = page.getByRole("link", { name: /log\s*in|sign\s*in|already have/i });
  }

  async goto(): Promise<void> {
    await this.page.goto("/register");
    await this.waitForPageLoad();
  }

  async register(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return this.errorMessage.textContent();
    }
    return null;
  }

  async isSuccessMessageVisible(): Promise<boolean> {
    return this.successMessage.isVisible();
  }

  async getPasswordStrength(): Promise<string | null> {
    if (await this.passwordStrength.isVisible()) {
      return this.passwordStrength.textContent();
    }
    return null;
  }

  async clickLoginLink(): Promise<void> {
    await this.loginLink.click();
  }
}
