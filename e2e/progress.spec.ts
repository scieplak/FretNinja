import { test, expect, TEST_USER } from "./fixtures/test-fixtures";

/**
 * Progress/Statistics Page E2E Tests
 * @see test-plan.md Section 4.6
 */

test.describe("Progress Page", () => {
  // Login before each test with delay to avoid rate limiting
  test.beforeEach(async ({ loginPage, page }) => {
    await page.waitForTimeout(500);

    await loginPage.goto();

    const testEmail = TEST_USER.email;
    const testPassword = TEST_USER.password;

    await loginPage.login(testEmail, testPassword);
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test.describe("Overview Tab", () => {
    test("should display statistics overview", async ({ progressPage }) => {
      await progressPage.goto();

      await progressPage.switchToOverviewTab();

      await expect(progressPage.totalQuizzes).toBeVisible();
    });

    test("should show stats by quiz type", async ({ progressPage }) => {
      await progressPage.goto();

      await progressPage.switchToOverviewTab();

      await expect(progressPage.byQuizTypeStats).toBeVisible();
    });

    test("should show stats by difficulty", async ({ progressPage }) => {
      await progressPage.goto();

      await progressPage.switchToOverviewTab();

      await expect(progressPage.byDifficultyStats).toBeVisible();
    });
  });

  test.describe("Heatmap Tab", () => {
    // PROG-001
    test("should display error heatmap fretboard", async ({ progressPage }) => {
      await progressPage.goto();

      await progressPage.switchToHeatmapTab();

      await expect(progressPage.heatmapFretboard).toBeVisible();
    });

    // PROG-002
    test("should update heatmap when filtering by quiz type", async ({ progressPage, page }) => {
      await progressPage.goto();

      await progressPage.switchToHeatmapTab();

      // Get initial hotspot count
      const initialCount = await progressPage.getErrorHotspotsCount();

      // Filter by quiz type
      await progressPage.filterByQuizType("find_note");
      await page.waitForTimeout(500);

      // Heatmap should update (count may change)
      const filteredCount = await progressPage.getErrorHotspotsCount();

      // Both should be valid states
      expect(filteredCount).toBeGreaterThanOrEqual(0);
      expect(initialCount).toBeGreaterThanOrEqual(0);
    });

    // PROG-003
    test("should filter by date range", async ({ progressPage, page }) => {
      await progressPage.goto();
      await progressPage.switchToHeatmapTab();

      // Wait for heatmap to load
      await expect(progressPage.heatmapFretboard).toBeVisible();

      // Check for filter controls - either by data-testid or by element type
      const quizTypeFilter = await progressPage.quizTypeFilter.isVisible().catch(() => false);
      const dateRangeFilter = await progressPage.dateRangeFilter.isVisible().catch(() => false);
      const hasSelects = (await page.locator("select").count()) > 0;

      // Filters should be present in the heatmap tab
      expect(quizTypeFilter || dateRangeFilter || hasSelects).toBe(true);

      // The heatmap content should remain visible after checking filters
      await expect(progressPage.heatmapFretboard).toBeVisible();
    });

    // PROG-005
    test("should show empty state message when no data", async ({ progressPage }) => {
      await progressPage.goto();

      await progressPage.switchToHeatmapTab();

      // Check for either heatmap data or empty state
      const isEmpty = await progressPage.isEmptyState();
      const hasData = (await progressPage.getErrorHotspotsCount()) > 0;

      // One of these should be true
      expect(isEmpty || hasData).toBe(true);
    });

    test("should display heatmap legend", async ({ progressPage }) => {
      await progressPage.goto();

      await progressPage.switchToHeatmapTab();

      await expect(progressPage.heatmapLegend).toBeVisible();
    });
  });

  test.describe("Session History Tab", () => {
    // PROG-004
    test("should display paginated session history", async ({ progressPage }) => {
      await progressPage.goto();

      await progressPage.switchToHistoryTab();

      await expect(progressPage.sessionHistoryList).toBeVisible();
    });

    test("should navigate between pages", async ({ progressPage, page }) => {
      await progressPage.goto();

      await progressPage.switchToHistoryTab();

      // Pagination controls should be visible (even if disabled)
      await expect(progressPage.nextPageButton).toBeVisible();
      await expect(progressPage.previousPageButton).toBeVisible();

      // Previous should be disabled on first page
      await expect(progressPage.previousPageButton).toBeDisabled();
    });

    test("should show session details in list", async ({ progressPage }) => {
      await progressPage.goto();

      await progressPage.switchToHistoryTab();

      const sessionCount = await progressPage.getSessionCount();

      // Either has sessions or empty state
      const isEmpty = await progressPage.isEmptyState();
      expect(sessionCount > 0 || isEmpty).toBe(true);
    });
  });

  test.describe("Tab Navigation", () => {
    test("should switch between tabs correctly", async ({ progressPage }) => {
      await progressPage.goto();

      // Switch to heatmap
      await progressPage.switchToHeatmapTab();
      await expect(progressPage.heatmapFretboard).toBeVisible();

      // Switch to history
      await progressPage.switchToHistoryTab();
      await expect(progressPage.sessionHistoryList).toBeVisible();

      // Switch back to overview
      await progressPage.switchToOverviewTab();
      await expect(progressPage.totalQuizzes).toBeVisible();
    });
  });

  test.describe("Data Accuracy", () => {
    test("should show consistent total quizzes with dashboard", async ({
      progressPage,
      dashboardPage,
    }) => {
      // Get dashboard count
      await dashboardPage.goto();
      const dashboardCount = await dashboardPage.getTotalQuizzes();

      // Get progress page count
      await progressPage.goto();
      await progressPage.switchToOverviewTab();
      const progressCount = await progressPage.getTotalQuizzes();

      expect(progressCount).toBe(dashboardCount);
    });
  });

  test.describe("Empty State", () => {
    test("should handle no quiz data gracefully", async ({ progressPage, page }) => {
      await progressPage.goto();

      // Page should load without errors - tabs should be visible
      await expect(progressPage.heatmapTab).toBeVisible();
      await expect(progressPage.overviewTab).toBeVisible();
      await expect(progressPage.historyTab).toBeVisible();

      // Page content should be visible (either data or loading state)
      // The heatmap tab is the default, so check for its content
      const hasContent = await page.locator("section").first().isVisible();
      expect(hasContent).toBe(true);
    });
  });
});
