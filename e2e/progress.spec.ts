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

  test.describe("Stats Tab", () => {
    test("should display statistics overview", async ({ progressPage }) => {
      await progressPage.goto();

      await progressPage.switchToStatsTab();

      await expect(progressPage.totalQuizzes).toBeVisible();
    });

    test("should show stats by quiz type", async ({ progressPage }) => {
      await progressPage.goto();

      await progressPage.switchToStatsTab();

      await expect(progressPage.byQuizTypeStats).toBeVisible();
    });

    test("should show stats by difficulty", async ({ progressPage }) => {
      await progressPage.goto();

      await progressPage.switchToStatsTab();

      await expect(progressPage.byDifficultyStats).toBeVisible();
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

      // Switch to stats
      await progressPage.switchToStatsTab();
      await expect(progressPage.totalQuizzes).toBeVisible();

      // Switch to history
      await progressPage.switchToHistoryTab();
      await expect(progressPage.sessionHistoryList).toBeVisible();

      // Switch back to mastery
      await progressPage.switchToMasteryTab();
      // Mastery tab content should be visible
      await expect(progressPage.masteryContainer).toBeVisible();
    });
  });

  test.describe("Data Accuracy", () => {
    test("should show consistent total quizzes with dashboard", async ({ progressPage, dashboardPage }) => {
      // Get dashboard count
      await dashboardPage.goto();
      const dashboardCount = await dashboardPage.getTotalQuizzes();

      // Get progress page count
      await progressPage.goto();
      await progressPage.switchToStatsTab();
      const progressCount = await progressPage.getTotalQuizzes();

      expect(progressCount).toBe(dashboardCount);
    });
  });

  test.describe("Empty State", () => {
    test("should handle no quiz data gracefully", async ({ progressPage, page }) => {
      await progressPage.goto();

      // Page should load without errors - tabs should be visible
      await expect(progressPage.masteryTab).toBeVisible();
      await expect(progressPage.statsTab).toBeVisible();
      await expect(progressPage.historyTab).toBeVisible();

      // Page content should be visible (either data or loading state)
      const hasContent = await page.locator("section").first().isVisible();
      expect(hasContent).toBe(true);
    });
  });
});
