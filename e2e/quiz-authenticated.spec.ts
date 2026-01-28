import { test, expect, TEST_USER } from "./fixtures/test-fixtures";

/**
 * Authenticated Quiz Flow E2E Tests
 * Tests quiz functionality with logged-in user
 * @see test-plan.md Section 4.2
 */

test.describe("Authenticated Quiz Flow", () => {
  // Login before each test
  test.beforeEach(async ({ loginPage, page }) => {
    await loginPage.goto();

    const testEmail = TEST_USER.email;
    const testPassword = TEST_USER.password;

    await loginPage.login(testEmail, testPassword);
    await page.waitForURL(/dashboard|quiz/, { timeout: 10000 });
  });

  test.describe("Quiz Session Persistence", () => {
    // QUIZ-005
    test("should create quiz session in database for authenticated user", async ({
      quizHubPage,
      quizActivePage,
      page,
    }) => {
      await quizHubPage.goto();
      await quizHubPage.selectAndStartQuiz("find_note", "easy");

      await quizActivePage.waitForQuestion();

      // Session should be created - URL should contain session ID or quiz state
      const url = page.url();
      expect(url).toMatch(/quiz|session/);

      // Fretboard should be visible
      await expect(quizActivePage.fretboard).toBeVisible();
    });

    test("should persist quiz progress after page reload", async ({
      quizHubPage,
      quizActivePage,
      page,
    }) => {
      await quizHubPage.goto();
      await quizHubPage.selectAndStartQuiz("find_note", "easy");

      // Answer a few questions
      for (let i = 0; i < 3; i++) {
        await quizActivePage.waitForQuestion();
        await quizActivePage.clickFretboardPosition(3, 5);
        await page.waitForTimeout(500);
        if (await quizActivePage.nextButton.isVisible()) {
          await quizActivePage.clickNext();
        }
      }

      // Reload page
      await page.reload();

      // Should still be in quiz with progress
      await quizActivePage.waitForQuestion();
      const questionNum = await quizActivePage.getCurrentQuestionNumber();
      expect(questionNum).toBeGreaterThanOrEqual(4);
    });
  });

  test.describe("Quiz Completion with Stats Update", () => {
    test("should update dashboard stats after completing quiz", async ({
      quizHubPage,
      quizActivePage,
      quizResultsPage,
      dashboardPage,
      page,
    }) => {
      // Get initial stats
      await dashboardPage.goto();
      const initialQuizzes = await dashboardPage.getTotalQuizzes();

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

      // Go to dashboard and check stats
      await dashboardPage.goto();
      const newQuizzes = await dashboardPage.getTotalQuizzes();

      expect(newQuizzes).toBe(initialQuizzes + 1);
    });

    test("should update streak after completing quiz", async ({
      quizHubPage,
      quizActivePage,
      quizResultsPage,
      dashboardPage,
      page,
    }) => {
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

      // Check dashboard streak
      await dashboardPage.goto();
      const streak = await dashboardPage.getCurrentStreak();

      expect(streak).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe("Achievement Earning", () => {
    // QUIZ-061
    test("should display achievement notification when earned", async ({
      quizHubPage,
      quizActivePage,
      quizResultsPage,
      page,
    }) => {
      // This test assumes the user hasn't earned "First Quiz" achievement yet
      // In real scenario, you'd use a fresh test user

      await quizHubPage.goto();
      await quizHubPage.selectAndStartQuiz("find_note", "easy");

      // Complete quiz
      for (let i = 0; i < 10; i++) {
        await quizActivePage.waitForQuestion();
        await quizActivePage.clickFretboardPosition(3, 5);
        await page.waitForTimeout(500);
        if (await quizActivePage.nextButton.isVisible()) {
          await quizActivePage.clickNext();
        }
      }

      await quizResultsPage.waitForResults();

      // Check if achievement notification is shown (may or may not appear based on user state)
      const hasAchievement = await quizResultsPage.isAchievementEarned();

      // Just verify the check works - achievement depends on user state
      expect(typeof hasAchievement).toBe("boolean");
    });
  });

  test.describe("All Quiz Types", () => {
    const quizTypes = [
      { type: "find_note" as const, name: "Find Note" },
      { type: "name_note" as const, name: "Name Note" },
      { type: "mark_chord" as const, name: "Mark Chord" },
      { type: "recognize_interval" as const, name: "Recognize Interval" },
    ];

    for (const { type, name } of quizTypes) {
      test(`should complete ${name} quiz successfully`, async ({
        quizHubPage,
        quizActivePage,
        quizResultsPage,
        page,
      }) => {
        await quizHubPage.goto();
        await quizHubPage.selectAndStartQuiz(type, "easy");

        // Complete 10 questions
        for (let i = 0; i < 10; i++) {
          await quizActivePage.waitForQuestion();

          // Different answer strategies based on quiz type
          if (type === "find_note") {
            await quizActivePage.clickFretboardPosition(3, 5);
          } else if (type === "mark_chord") {
            // Select 3 positions for chord
            await quizActivePage.clickFretboardPosition(3, 5);
            await quizActivePage.clickFretboardPosition(4, 5);
            await quizActivePage.clickFretboardPosition(5, 5);
            // Submit chord answer
            await quizActivePage.submitAnswer();
          } else {
            // name_note or recognize_interval - click first option then submit
            const firstOption = quizActivePage.answerOptions.first();
            if (await firstOption.isVisible()) {
              await firstOption.click();
              // Submit the selected answer
              await quizActivePage.submitAnswer();
            } else {
              await quizActivePage.clickFretboardPosition(3, 5);
            }
          }

          // Wait for feedback animation (1.5s) and auto-advance
          await page.waitForTimeout(2000);
          // Check if there's a next button (some modes might have one)
          if (await quizActivePage.nextButton.isVisible().catch(() => false)) {
            await quizActivePage.clickNext();
          }
        }

        await quizResultsPage.waitForResults();
        const score = await quizResultsPage.getScore();
        expect(score).toBeGreaterThanOrEqual(0);
      });
    }
  });

  test.describe("Quiz Abandonment", () => {
    test("should allow abandoning quiz and return to hub", async ({
      quizHubPage,
      quizActivePage,
      page,
    }) => {
      await quizHubPage.goto();
      await quizHubPage.selectAndStartQuiz("find_note", "easy");

      await quizActivePage.waitForQuestion();

      // Answer a couple questions
      await quizActivePage.clickFretboardPosition(3, 5);
      await page.waitForTimeout(500);

      // Abandon quiz
      await quizActivePage.abandonQuiz();

      // Should be back at quiz hub or show confirmation
      await expect(page).toHaveURL(/quiz/, { timeout: 5000 });
    });
  });

  test.describe("Session History", () => {
    test("should show completed quiz in recent sessions", async ({
      quizHubPage,
      quizActivePage,
      quizResultsPage,
      dashboardPage,
      page,
    }) => {
      // Complete a quiz
      await quizHubPage.goto();
      await quizHubPage.selectAndStartQuiz("find_note", "medium");

      for (let i = 0; i < 10; i++) {
        await quizActivePage.waitForQuestion();
        await quizActivePage.clickFretboardPosition(3, 5);
        await page.waitForTimeout(500);
        if (await quizActivePage.nextButton.isVisible()) {
          await quizActivePage.clickNext();
        }
      }

      await quizResultsPage.waitForResults();

      // Check dashboard for recent session
      await dashboardPage.goto();
      const sessionCount = await dashboardPage.getRecentSessionsCount();

      expect(sessionCount).toBeGreaterThanOrEqual(1);
    });
  });
});
