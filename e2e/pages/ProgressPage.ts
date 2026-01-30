import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Progress/Statistics page
 */
export class ProgressPage extends BasePage {
  // Tabs (actual tabs: mastery, stats, history)
  readonly masteryTab: Locator;
  readonly statsTab: Locator;
  readonly historyTab: Locator;

  // Mastery tab
  readonly masteryContainer: Locator;

  // Stats tab
  readonly totalQuizzes: Locator;
  readonly practiceTime: Locator;
  readonly currentStreak: Locator;
  readonly byQuizTypeStats: Locator;
  readonly byDifficultyStats: Locator;

  // Session history
  readonly sessionHistoryList: Locator;
  readonly sessionItems: Locator;
  readonly paginationControls: Locator;
  readonly nextPageButton: Locator;
  readonly previousPageButton: Locator;

  // Empty state
  readonly emptyStateMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Tabs - using data-testid (actual tabs: mastery, stats, history)
    this.masteryTab = page.getByTestId("progress-tab-mastery");
    this.statsTab = page.getByTestId("progress-tab-stats");
    this.historyTab = page.getByTestId("progress-tab-history");

    // Mastery tab content
    this.masteryContainer = page.getByTestId("progress-mastery-container");

    // Stats tab - using data-testid
    this.totalQuizzes = page.getByTestId("progress-total-quizzes");
    this.practiceTime = page.getByTestId("progress-practice-time");
    this.currentStreak = page.getByTestId("progress-current-streak");
    this.byQuizTypeStats = page.getByTestId("progress-stats-by-quiz-type");
    this.byDifficultyStats = page.getByTestId("progress-stats-by-difficulty");

    // History - using data-testid
    this.sessionHistoryList = page.getByTestId("progress-history-table");
    this.sessionItems = page.getByTestId("progress-history-body").locator("tr");
    this.paginationControls = page.getByTestId("progress-history-pagination");
    this.nextPageButton = page.getByTestId("progress-history-next-button");
    this.previousPageButton = page.getByTestId("progress-history-prev-button");

    // Empty state
    this.emptyStateMessage = page.getByTestId("progress-error-message");
  }

  async goto(): Promise<void> {
    await this.page.goto("/progress");
    await this.waitForPageLoad();
  }

  async switchToMasteryTab(): Promise<void> {
    await this.masteryTab.click();
  }

  async switchToStatsTab(): Promise<void> {
    await this.statsTab.click();
  }

  async switchToHistoryTab(): Promise<void> {
    await this.historyTab.click();
  }

  async getTotalQuizzes(): Promise<number> {
    // Make sure we're on the stats tab
    if (!(await this.totalQuizzes.isVisible({ timeout: 1000 }).catch(() => false))) {
      await this.switchToStatsTab();
    }
    const text = await this.page.getByTestId("progress-total-quizzes-value").textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getSessionCount(): Promise<number> {
    return this.sessionItems.count();
  }

  async goToNextPage(): Promise<void> {
    await this.nextPageButton.click();
  }

  async goToPreviousPage(): Promise<void> {
    await this.previousPageButton.click();
  }

  async isEmptyState(): Promise<boolean> {
    return this.emptyStateMessage.isVisible();
  }
}
