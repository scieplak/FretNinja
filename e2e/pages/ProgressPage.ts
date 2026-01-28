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

    // Tabs
    this.overviewTab = page.getByRole("tab", { name: /overview|summary/i });
    this.heatmapTab = page.getByRole("tab", { name: /heatmap|errors/i });
    this.historyTab = page.getByRole("tab", { name: /history|sessions/i });

    // Overview
    this.totalQuizzes = page.getByTestId("total-quizzes");
    this.averageScore = page.getByTestId("average-score");
    this.bestScore = page.getByTestId("best-score");
    this.byQuizTypeStats = page.getByTestId("by-quiz-type");
    this.byDifficultyStats = page.getByTestId("by-difficulty");

    // Heatmap
    this.heatmapFretboard = page.getByTestId("heatmap-fretboard");
    this.heatmapLegend = page.getByTestId("heatmap-legend");
    this.errorHotspots = page.locator("[data-error-count]");

    // Filters
    this.quizTypeFilter = page.getByRole("combobox", { name: /quiz type/i });
    this.dateRangeFilter = page.getByRole("combobox", { name: /date range/i });
    this.fromDateInput = page.getByLabel(/from date/i);
    this.toDateInput = page.getByLabel(/to date/i);

    // History
    this.sessionHistoryList = page.getByTestId("session-history");
    this.sessionItems = page.locator("[data-session-id]");
    this.paginationControls = page.getByRole("navigation", { name: /pagination/i });
    this.nextPageButton = page.getByRole("button", { name: /next/i });
    this.previousPageButton = page.getByRole("button", { name: /previous|prev/i });

    // Empty state
    this.emptyStateMessage = page.getByText(/no data|no quizzes|start practicing/i);
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
    await this.quizTypeFilter.click();
    await this.page.getByRole("option", { name: new RegExp(quizType, "i") }).click();
  }

  async filterByDateRange(from: string, to: string): Promise<void> {
    await this.fromDateInput.fill(from);
    await this.toDateInput.fill(to);
  }

  async getTotalQuizzes(): Promise<number> {
    const text = await this.totalQuizzes.textContent();
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
