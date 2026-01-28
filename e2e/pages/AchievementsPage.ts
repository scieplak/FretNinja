import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Achievements page
 */
export class AchievementsPage extends BasePage {
  // Achievement cards
  readonly achievementCards: Locator;
  readonly earnedAchievements: Locator;
  readonly progressAchievements: Locator;
  readonly lockedAchievements: Locator;

  // Progress indicators
  readonly progressBars: Locator;

  // Status badges
  readonly earnedBadges: Locator;
  readonly newBadges: Locator;

  // Error/empty states
  readonly errorMessage: Locator;
  readonly loadingMessage: Locator;

  // For compatibility - these are the same view, just filtered
  readonly earnedAchievementsList: Locator;
  readonly progressAchievementsList: Locator;

  constructor(page: Page) {
    super(page);

    // All achievement cards using data-testid
    this.achievementCards = page.locator("[data-testid^='achievement-card-']");

    // Earned achievements by data-status attribute
    this.earnedAchievements = page.locator("[data-testid^='achievement-card-'][data-status='earned']");

    // Progress achievements by data-status attribute
    this.progressAchievements = page.locator("[data-testid^='achievement-card-'][data-status='progress']");

    // Locked achievements by data-status attribute
    this.lockedAchievements = page.locator("[data-testid^='achievement-card-'][data-status='locked']");

    // Progress bars using data-testid
    this.progressBars = page.locator("[data-testid^='achievement-progress-bar-']");

    // Earned badges using data-testid
    this.earnedBadges = page.locator("[data-testid^='achievement-earned-badge-']");
    this.newBadges = page.locator("[data-testid^='achievement-new-badge-']");

    // Error and loading states
    this.errorMessage = page.getByTestId("achievements-error-message");
    this.loadingMessage = page.getByTestId("achievements-loading");

    // Grid container
    this.earnedAchievementsList = page.getByTestId("achievements-grid");
    this.progressAchievementsList = page.getByTestId("achievements-grid");
  }

  async goto(): Promise<void> {
    await this.page.goto("/achievements");
    await this.waitForPageLoad();
  }

  // The achievements page doesn't have tabs, so these are no-ops
  async switchToEarnedTab(): Promise<void> {
    // No tabs in this implementation
  }

  async switchToProgressTab(): Promise<void> {
    // No tabs in this implementation
  }

  async getEarnedCount(): Promise<number> {
    return this.earnedBadges.count();
  }

  async getTotalAchievementsCount(): Promise<number> {
    return this.achievementCards.count();
  }

  async getAchievementProgress(achievementName: string): Promise<number> {
    const card = this.page.locator("div.rounded-2xl").filter({
      hasText: achievementName,
    });
    const progressText = card.locator("p.text-xs.text-slate-400");

    if (await progressText.isVisible()) {
      const text = await progressText.textContent();
      const match = text?.match(/(\d+)%/);
      return match ? parseInt(match[1], 10) : 0;
    }
    return 0;
  }

  async isAchievementEarned(achievementName: string): Promise<boolean> {
    const card = this.page.locator("div.rounded-2xl").filter({
      hasText: achievementName,
    });
    const earnedBadge = card.getByText(/^earned$/i);
    return earnedBadge.isVisible();
  }

  async getAchievementNames(): Promise<string[]> {
    const titles = this.page.locator("div.rounded-2xl.border.p-6 h2");
    const count = await titles.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const name = await titles.nth(i).textContent();
      if (name) names.push(name.trim());
    }

    return names;
  }

  async getTotalEarnedDisplayed(): Promise<number> {
    return this.getEarnedCount();
  }
}
