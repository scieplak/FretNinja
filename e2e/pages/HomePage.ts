import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Home page
 */
export class HomePage extends BasePage {
  // Locators
  readonly heading: Locator;
  readonly getStartedButton: Locator;
  readonly tryAsGuestButton: Locator;
  readonly loginLink: Locator;
  readonly featureCards: Locator;

  constructor(page: Page) {
    super(page);

    // Define locators using resilient selectors
    this.heading = page.getByRole("heading", { level: 1 });
    this.getStartedButton = page.getByRole("link", { name: /get started free/i });
    this.tryAsGuestButton = page.getByRole("link", { name: /try as guest/i });
    this.loginLink = page.getByRole("link", { name: /log in/i });
    this.featureCards = page.locator("div.rounded-2xl.border.p-6");
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
    await this.waitForPageLoad();
  }

  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  async clickGetStarted(): Promise<void> {
    await this.getStartedButton.click();
  }

  async clickTryAsGuest(): Promise<void> {
    await this.tryAsGuestButton.click();
  }

  async clickLogin(): Promise<void> {
    await this.loginLink.click();
  }

  async getFeatureCount(): Promise<number> {
    return this.featureCards.count();
  }
}
