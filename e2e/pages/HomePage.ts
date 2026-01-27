import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Home page
 */
export class HomePage extends BasePage {
  // Locators
  readonly heading: Locator;
  readonly startQuizButton: Locator;
  readonly exploreFretboardLink: Locator;

  constructor(page: Page) {
    super(page);

    // Define locators using resilient selectors
    this.heading = page.getByRole('heading', { level: 1 });
    this.startQuizButton = page.getByRole('button', { name: /start|quiz/i });
    this.exploreFretboardLink = page.getByRole('link', { name: /explore|fretboard/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  async clickStartQuiz(): Promise<void> {
    await this.startQuizButton.click();
  }

  async clickExploreFretboard(): Promise<void> {
    await this.exploreFretboardLink.click();
  }
}
