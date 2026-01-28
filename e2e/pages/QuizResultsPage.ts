import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Quiz Results view
 */
export class QuizResultsPage extends BasePage {
  // Score display
  readonly scoreHeading: Locator;
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

    // Score is displayed in h1 with format "X/Y · Z%"
    this.scoreHeading = page.locator("h1").filter({ hasText: /\d+\/\d+.*%/ });
    this.motivationalMessage = page.locator("header p.text-sm");

    // Achievement section
    this.achievementSection = page.locator("section").filter({ hasText: /achievements earned/i });
    this.achievementBadges = this.achievementSection.locator("span.rounded-full");

    // Question breakdown
    this.breakdownSection = page.locator("section").filter({ hasText: /breakdown/i });
    this.missedQuestions = this.breakdownSection.locator("div.rounded-lg.border");

    // Action links
    this.retryButton = page.getByRole("link", { name: /retry same quiz/i });
    this.differentModeLink = page.getByRole("link", { name: /try different mode/i });
    this.dashboardLink = page.getByRole("link", { name: /back to dashboard/i });

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
    const perfectMessage = this.breakdownSection.getByText(/nailed every question/i);
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
}
