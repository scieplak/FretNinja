import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Dashboard page
 */
export class DashboardPage extends BasePage {
  // Stats overview
  readonly totalQuizzesSection: Locator;
  readonly totalQuizzes: Locator;
  readonly currentStreakBadge: Locator;
  readonly currentStreak: Locator;
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

    // Stats section using data-testid
    this.totalQuizzesSection = page.getByTestId("dashboard-stat-0");
    this.totalQuizzes = this.totalQuizzesSection;
    this.currentStreakBadge = page.getByTestId("dashboard-streak");
    this.currentStreak = this.currentStreakBadge;
    this.practiceTimeSection = page.getByTestId("dashboard-stat-2");

    // Recent sessions section using data-testid
    this.recentSessionsList = page.getByTestId("dashboard-recent-activity");
    this.recentSessionItems = page.getByTestId("dashboard-session-item");

    // Quick actions using data-testid
    this.startQuizButton = page.getByTestId("dashboard-start-quiz-button");
    this.viewProgressButton = page.getByTestId("dashboard-view-activity");
    this.viewAchievementsButton = page.getByTestId("dashboard-view-achievements");

    // Empty state
    this.emptyStateMessage = page.getByTestId("dashboard-empty-sessions");

    // User greeting using data-testid
    this.userGreeting = page.getByTestId("dashboard-welcome");
    // Logout button is in the header, "Sign out"
    this.logoutButton = page.getByRole("button", { name: /sign out/i });
  }

  async goto(): Promise<void> {
    await this.page.goto("/dashboard");
    await this.waitForPageLoad();
    // Wait for stats to load (value changes from "…" to actual number)
    await this.page.waitForFunction(
      () => {
        const statsEl = document.querySelector('[data-testid="dashboard-stat-0"] p.text-xl');
        return statsEl && !statsEl.textContent?.includes("…");
      },
      { timeout: 10000 }
    ).catch(() => {
      // Stats may already be loaded or user is guest
    });
  }

  async getTotalQuizzes(): Promise<number> {
    // Get the value from the first stat block (Quizzes completed)
    const valueText = await this.totalQuizzesSection.locator("p.text-xl").textContent();
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
    // Count session items using data-testid
    return this.recentSessionItems.count();
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
