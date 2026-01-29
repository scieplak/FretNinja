import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Progress/Statistics page
 */
export class ProgressPage extends BasePage {
  // Tabs
  readonly overviewTab: Locator;
  readonly heatmapTab: Locator;
  readonly historyTab: Locator;

  // Overview stats
  readonly totalQuizzes: Locator;
  readonly averageScore: Locator;
  readonly bestScore: Locator;
  readonly byQuizTypeStats: Locator;
  readonly byDifficultyStats: Locator;

  // Heatmap
  readonly heatmapFretboard: Locator;
  readonly heatmapLegend: Locator;
  readonly errorHotspots: Locator;

  // Filters
  readonly quizTypeFilter: Locator;
  readonly dateRangeFilter: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;

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

    // Tabs - using data-testid
    this.overviewTab = page.getByTestId("progress-tab-stats");
    this.heatmapTab = page.getByTestId("progress-tab-heatmap");
    this.historyTab = page.getByTestId("progress-tab-history");

    // Overview - using data-testid
    this.totalQuizzes = page.getByTestId("progress-total-quizzes");
    this.averageScore = page.getByTestId("progress-practice-time");
    this.bestScore = page.getByTestId("progress-current-streak");
    this.byQuizTypeStats = page.getByTestId("progress-stats-by-quiz-type");
    this.byDifficultyStats = page.getByTestId("progress-stats-by-difficulty");

    // Heatmap - using data-testid
    this.heatmapFretboard = page.getByTestId("progress-heatmap-container");
    this.heatmapLegend = page
      .locator("div")
      .filter({ hasText: /errors$/ })
      .first();
    this.errorHotspots = page.locator("div.rounded-lg.border.group");

    // Filters - using data-testid
    this.quizTypeFilter = page.getByTestId("progress-heatmap-quiz-type-select");
    this.dateRangeFilter = page.getByTestId("progress-heatmap-date-range-select");
    this.fromDateInput = page.getByLabel(/from date/i);
    this.toDateInput = page.getByLabel(/to date/i);

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

  async switchToOverviewTab(): Promise<void> {
    await this.overviewTab.click();
  }

  async switchToHeatmapTab(): Promise<void> {
    await this.heatmapTab.click();
  }

  async switchToHistoryTab(): Promise<void> {
    await this.historyTab.click();
  }

  async filterByQuizType(quizType: string): Promise<void> {
    // Use selectOption for select element
    await this.quizTypeFilter.selectOption({ value: quizType });
  }

  async filterByDateRange(range: string): Promise<void> {
    // Use selectOption for the date range dropdown
    await this.dateRangeFilter.selectOption({ value: range });
  }

  async getTotalQuizzes(): Promise<number> {
    // Make sure we're on the stats tab
    if (!(await this.totalQuizzes.isVisible({ timeout: 1000 }).catch(() => false))) {
      await this.switchToOverviewTab();
    }
    const text = await this.page.getByTestId("progress-total-quizzes-value").textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getAverageScore(): Promise<number> {
    const text = await this.averageScore.textContent();
    const match = text?.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
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

  async getErrorHotspotsCount(): Promise<number> {
    return this.errorHotspots.count();
  }
}
