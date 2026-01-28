import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Quiz Results view
 */
export class QuizResultsPage extends BasePage {
  // Score display
  readonly scoreHeading: Locator;
  readonly scoreValue: Locator;
  readonly motivationalMessage: Locator;

  // Achievement notification
  readonly achievementSection: Locator;
  readonly achievementBadges: Locator;

  // Question review
  readonly breakdownSection: Locator;
  readonly missedQuestions: Locator;

  // Actions
  readonly retryButton: Locator;
  readonly differentModeLink: Locator;
  readonly dashboardLink: Locator;

  // Loading state
  readonly loadingMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Score is displayed with data-testid
    this.scoreHeading = page.getByTestId("quiz-results-score");
    this.scoreValue = this.scoreHeading;
    this.motivationalMessage = page.getByTestId("quiz-results-message");

    // Achievement section
    this.achievementSection = page.getByTestId("quiz-results-achievements");
    this.achievementBadges = page.getByTestId("quiz-results-achievement-list").locator("span");

    // Question breakdown
    this.breakdownSection = page.getByTestId("quiz-results-breakdown");
    this.missedQuestions = page.getByTestId("quiz-results-missed-questions").locator("div[data-testid^='quiz-results-missed-']");

    // Action links
    this.retryButton = page.getByTestId("quiz-results-retry-button");
    this.differentModeLink = page.getByTestId("quiz-results-different-mode-link");
    this.dashboardLink = page.getByTestId("quiz-results-dashboard-link");

    this.loadingMessage = page.getByText(/loading your results/i);
  }

  async goto(): Promise<void> {
    // Results page is not directly navigable
    throw new Error("QuizResultsPage cannot be navigated to directly. Complete a quiz first.");
  }

  async waitForResults(): Promise<void> {
    await this.scoreHeading.waitFor({ state: "visible", timeout: 10000 });
  }

  async getScore(): Promise<number> {
    const text = await this.scoreHeading.textContent();
    const match = text?.match(/(\d+)\/\d+/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getTotalQuestions(): Promise<number> {
    const text = await this.scoreHeading.textContent();
    const match = text?.match(/\d+\/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getScorePercentage(): Promise<number> {
    const text = await this.scoreHeading.textContent();
    const match = text?.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getMotivationalMessage(): Promise<string | null> {
    if (await this.motivationalMessage.isVisible()) {
      return this.motivationalMessage.textContent();
    }
    return null;
  }

  async isAchievementEarned(): Promise<boolean> {
    return this.achievementSection.isVisible();
  }

  async getEarnedAchievementNames(): Promise<string[]> {
    if (!(await this.isAchievementEarned())) {
      return [];
    }
    const badges = this.achievementBadges;
    const count = await badges.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const name = await badges.nth(i).textContent();
      if (name) names.push(name.trim());
    }

    return names;
  }

  async getMissedQuestionsCount(): Promise<number> {
    // Check for "You nailed every question" message
    const perfectMessage = this.page.getByTestId("quiz-results-perfect");
    if (await perfectMessage.isVisible()) {
      return 0;
    }
    return this.missedQuestions.count();
  }

  async clickRetry(): Promise<void> {
    await this.retryButton.click();
  }

  async clickDifferentMode(): Promise<void> {
    await this.differentModeLink.click();
  }

  async clickDashboard(): Promise<void> {
    await this.dashboardLink.click();
  }

  async clickPlayAgain(): Promise<void> {
    await this.differentModeLink.click();
  }
}
