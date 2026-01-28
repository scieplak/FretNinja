import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Dashboard page
 */
export class DashboardPage extends BasePage {
  // Stats overview
  readonly totalQuizzesSection: Locator;
  readonly currentStreakBadge: Locator;
  readonly practiceTimeSection: Locator;

  // Recent sessions
  readonly recentSessionsList: Locator;
  readonly recentSessionItems: Locator;

  // Quick actions
  readonly startQuizButton: Locator;
  readonly viewProgressButton: Locator;
  readonly viewAchievementsButton: Locator;

  // Empty state
  readonly emptyStateMessage: Locator;

  // User info
  readonly userGreeting: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);

    // Stats are in the Quick stats section
    this.totalQuizzesSection = page.locator("div").filter({ hasText: /^quizzes completed$/i }).first();
    this.currentStreakBadge = page.getByText(/\d+ day streak/);
    this.practiceTimeSection = page.locator("div").filter({ hasText: /^practice time$/i }).first();

    // Recent sessions section
    this.recentSessionsList = page.locator("section").filter({ hasText: /recent activity/i });
    this.recentSessionItems = this.recentSessionsList.locator("div").filter({ has: page.locator("span") });

    // Quick actions
    this.startQuizButton = page.getByRole("link", { name: /start quiz/i });
    this.viewProgressButton = page.getByRole("link", { name: /view all activity/i });
    this.viewAchievementsButton = page.getByRole("link", { name: /view all achievements/i });

    // Empty state
    this.emptyStateMessage = page.getByText(/no sessions yet|take your first quiz/i);

    // User greeting in h1
    this.userGreeting = page.locator("h1").filter({ hasText: /welcome back/i });
    // Logout button is in the header, "Sign out"
    this.logoutButton = page.getByRole("button", { name: /sign out/i });
  }

  async goto(): Promise<void> {
    await this.page.goto("/dashboard");
    await this.waitForPageLoad();
  }

  async getTotalQuizzes(): Promise<number> {
    // Look for the value in the Quick stats section next to "Quizzes completed"
    const statsSection = this.page.locator("section").filter({ hasText: /quick stats/i });
    const quizzesBlock = statsSection.locator("div").filter({ hasText: /quizzes completed/i }).first();
    const valueText = await quizzesBlock.locator("p.text-xl").textContent();
    const match = valueText?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getCurrentStreak(): Promise<number> {
    const text = await this.currentStreakBadge.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getLongestStreak(): Promise<number> {
    // Dashboard doesn't show longest streak separately, return current streak
    return this.getCurrentStreak();
  }

  async getRecentSessionsCount(): Promise<number> {
    // Count session items in recent activity section
    const sessionItems = this.recentSessionsList.locator("div.flex.items-center.justify-between");
    return sessionItems.count();
  }

  async isEmptyState(): Promise<boolean> {
    return this.emptyStateMessage.isVisible();
  }

  async clickStartQuiz(): Promise<void> {
    await this.startQuizButton.click();
  }

  async clickViewProgress(): Promise<void> {
    await this.viewProgressButton.click();
  }

  async clickViewAchievements(): Promise<void> {
    await this.viewAchievementsButton.click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }

  async getUserGreeting(): Promise<string | null> {
    if (await this.userGreeting.isVisible()) {
      return this.userGreeting.textContent();
    }
    return null;
  }
}
