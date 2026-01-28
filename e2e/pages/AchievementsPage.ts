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

    // All achievement cards are divs with rounded-2xl class
    this.achievementCards = page.locator("div.rounded-2xl.border.p-6");

    // Earned achievements have emerald styling
    this.earnedAchievements = page.locator("div.rounded-2xl.border-emerald-400\\/40");

    // Progress achievements have progress bars
    this.progressAchievements = page.locator("div.rounded-2xl").filter({
      has: page.locator("div.h-2.overflow-hidden"),
    });

    // Locked achievements have "Locked" text
    this.lockedAchievements = page.locator("div.rounded-2xl").filter({
      hasText: /locked/i,
    });

    // Progress bars are the h-2 divs with bg-emerald-400
    this.progressBars = page.locator("div.h-2.overflow-hidden.rounded-full");

    // Earned badges
    this.earnedBadges = page.getByText(/^earned$/i);
    this.newBadges = page.getByText(/^new$/i);

    // Error and loading states
    this.errorMessage = page.locator("div.border-rose-500\\/40");
    this.loadingMessage = page.getByText(/loading achievements/i);

    // For compatibility with tab-based tests
    this.earnedAchievementsList = this.earnedAchievements;
    this.progressAchievementsList = this.progressAchievements;
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
