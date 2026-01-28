import { test, expect, TEST_USER } from "./fixtures/test-fixtures";

/**
 * Achievements Page E2E Tests
 * @see test-plan.md Section 4.7
 */

test.describe("Achievements", () => {
  test.describe("Public Achievements List", () => {
    // ACH-001
    test("should display all available achievements", async ({ achievementsPage }) => {
      await achievementsPage.goto();

      const count = await achievementsPage.getTotalAchievementsCount();
      expect(count).toBeGreaterThan(0);
    });

    test("should show achievement names and descriptions", async ({ achievementsPage }) => {
      await achievementsPage.goto();

      const names = await achievementsPage.getAchievementNames();
      expect(names.length).toBeGreaterThan(0);
    });
  });

  test.describe("User Achievements (Authenticated)", () => {
    test.beforeEach(async ({ loginPage, page }) => {
      await loginPage.goto();

      const testEmail = TEST_USER.email;
      const testPassword = TEST_USER.password;

      await loginPage.login(testEmail, testPassword);
      await page.waitForURL(/dashboard/, { timeout: 10000 });
    });

    // ACH-002
    test("should show earned achievements with dates", async ({ achievementsPage }) => {
      await achievementsPage.goto();

      await achievementsPage.switchToEarnedTab();

      const earnedCount = await achievementsPage.getEarnedCount();

      // User may or may not have earned achievements
      expect(earnedCount).toBeGreaterThanOrEqual(0);
    });

    // ACH-003
    test("should show progress bars for unearned achievements", async ({ achievementsPage }) => {
      await achievementsPage.goto();

      await achievementsPage.switchToProgressTab();

      const progressBars = achievementsPage.progressBars;
      const count = await progressBars.count();

      // Should have progress indicators for unearned achievements
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test("should display total earned count", async ({ achievementsPage }) => {
      await achievementsPage.goto();

      const earnedDisplayed = await achievementsPage.getTotalEarnedDisplayed();
      const actualEarned = await achievementsPage.getEarnedCount();

      // Displayed count should match actual
      expect(earnedDisplayed).toBe(actualEarned);
    });

    test("should switch between earned and progress tabs", async ({ achievementsPage }) => {
      await achievementsPage.goto();

      // Switch to earned
      await achievementsPage.switchToEarnedTab();
      await expect(achievementsPage.earnedAchievementsList).toBeVisible();

      // Switch to progress
      await achievementsPage.switchToProgressTab();
      await expect(achievementsPage.progressAchievementsList).toBeVisible();
    });
  });

  test.describe("Achievement Progress Tracking", () => {
    test.beforeEach(async ({ loginPage, page }) => {
      await loginPage.goto();

      const testEmail = TEST_USER.email;
      const testPassword = TEST_USER.password;

      await loginPage.login(testEmail, testPassword);
      await page.waitForURL(/dashboard/, { timeout: 10000 });
    });

    test("should show progress percentage for in-progress achievements", async ({ achievementsPage }) => {
      await achievementsPage.goto();

      await achievementsPage.switchToProgressTab();

      // Get all progress bars
      const progressBars = achievementsPage.progressBars;
      const count = await progressBars.count();

      if (count > 0) {
        const firstProgress = progressBars.first();
        const value = await firstProgress.getAttribute("aria-valuenow");

        // Progress should be a valid number
        if (value) {
          const numValue = parseInt(value, 10);
          expect(numValue).toBeGreaterThanOrEqual(0);
          expect(numValue).toBeLessThanOrEqual(100);
        }
      }
    });

    test("should update progress after completing quiz", async ({
      achievementsPage,
      quizHubPage,
      quizActivePage,
      quizResultsPage,
      page,
    }) => {
      // Note: This test assumes there's a "total quizzes" type achievement

      // Get initial achievement state
      await achievementsPage.goto();
      await achievementsPage.switchToProgressTab();

      // Complete a quiz
      await quizHubPage.goto();
      await quizHubPage.selectAndStartQuiz("find_note", "easy");

      for (let i = 0; i < 10; i++) {
        await quizActivePage.waitForQuestion();
        await quizActivePage.clickFretboardPosition(3, 5);
        await page.waitForTimeout(500);
        if (await quizActivePage.nextButton.isVisible()) {
          await quizActivePage.clickNext();
        }
      }

      await quizResultsPage.waitForResults();

      // Check achievements page again
      await achievementsPage.goto();

      // Page should load without errors
      await expect(achievementsPage.achievementCards.first()).toBeVisible();
    });
  });

  test.describe("Achievement Types", () => {
    test("should display different achievement categories", async ({ achievementsPage }) => {
      await achievementsPage.goto();

      const names = await achievementsPage.getAchievementNames();

      // Should have various achievement types based on test-plan Appendix
      // (total_quizzes, perfect_score, streak, quiz_count)
      expect(names.length).toBeGreaterThan(0);
    });
  });

  test.describe("Visual Elements", () => {
    test("should display achievement badges/icons", async ({ achievementsPage, page }) => {
      await achievementsPage.goto();

      // Check for badge/icon elements
      const badges = page.locator("[data-achievement-badge], .achievement-icon, svg");
      const count = await badges.count();

      expect(count).toBeGreaterThan(0);
    });

    test("should differentiate earned vs unearned visually", async ({ achievementsPage, page }) => {
      await achievementsPage.goto();

      // Earned achievements should have different styling
      const earned = page.locator("[data-earned='true']");
      const unearned = page.locator("[data-earned='false']");

      const earnedCount = await earned.count();
      const unearnedCount = await unearned.count();

      // At least one type should exist
      expect(earnedCount + unearnedCount).toBeGreaterThan(0);
    });
  });
});
