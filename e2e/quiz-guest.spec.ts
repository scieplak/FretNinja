import { test, expect } from "./fixtures/test-fixtures";

/**
 * Guest Quiz Flow E2E Tests
 * Tests quiz functionality without authentication
 * @see test-plan.md Section 4.2
 */

test.describe("Guest Quiz Flow", () => {
  test.describe("Quiz Hub", () => {
    // QUIZ-001
    test("should highlight Find Note mode when selected", async ({ quizHubPage }) => {
      await quizHubPage.goto();

      await quizHubPage.selectQuizType("find_note");

      await expect(quizHubPage.findNoteButton).toHaveAttribute("data-selected", "true");
    });

    // QUIZ-002
    test("should show timer warning when Hard difficulty is selected", async ({ quizHubPage }) => {
      await quizHubPage.goto();

      await quizHubPage.selectQuizType("find_note");
      await quizHubPage.selectDifficulty("hard");

      const isWarningVisible = await quizHubPage.isTimerWarningVisible();
      expect(isWarningVisible).toBe(true);
    });

    // QUIZ-003
    test("should disable start button without mode selection", async ({ quizHubPage }) => {
      await quizHubPage.goto();

      const isEnabled = await quizHubPage.isStartButtonEnabled();
      expect(isEnabled).toBe(false);
    });

    // QUIZ-004
    test("should start quiz as guest without errors", async ({ quizHubPage, quizActivePage, page }) => {
      await quizHubPage.goto();

      await quizHubPage.selectAndStartQuiz("find_note", "easy");

      // Should navigate to active quiz
      await quizActivePage.waitForQuestion();
      await expect(quizActivePage.fretboard).toBeVisible();
    });
  });

  test.describe("Find Note Quiz", () => {
    test.beforeEach(async ({ quizHubPage }) => {
      await quizHubPage.goto();
      await quizHubPage.selectAndStartQuiz("find_note", "easy");
    });

    // QUIZ-010
    test("should display note name and fretboard", async ({ quizActivePage }) => {
      await quizActivePage.waitForQuestion();

      const questionText = await quizActivePage.getQuestionText();
      expect(questionText).toMatch(/find|locate|click/i);

      await expect(quizActivePage.fretboard).toBeVisible();
    });

    // QUIZ-013
    test("should complete 10 questions and show results", async ({ quizActivePage, quizResultsPage, page }) => {
      // Answer 10 questions (clicking random positions)
      for (let i = 0; i < 10; i++) {
        await quizActivePage.waitForQuestion();

        // Click a position on the fretboard
        await quizActivePage.clickFretboardPosition(Math.floor(Math.random() * 12), Math.floor(Math.random() * 6) + 1);

        // Wait for feedback and auto-advance or click next
        await page.waitForTimeout(1000);

        // If next button is visible, click it
        if (await quizActivePage.nextButton.isVisible()) {
          await quizActivePage.clickNext();
        }
      }

      // Should show results
      await quizResultsPage.waitForResults();
      await expect(quizResultsPage.scoreValue).toBeVisible();
    });
  });

  test.describe("Name Note Quiz", () => {
    test.beforeEach(async ({ quizHubPage }) => {
      await quizHubPage.goto();
      await quizHubPage.selectAndStartQuiz("name_note", "easy");
    });

    // QUIZ-020
    test("should highlight position and show note options", async ({ quizActivePage }) => {
      await quizActivePage.waitForQuestion();

      // Position should be highlighted
      const highlighted = await quizActivePage.getHighlightedPositions();
      expect(highlighted.length).toBeGreaterThan(0);

      // Note options should be visible
      await expect(quizActivePage.answerOptions.first()).toBeVisible();
    });
  });

  test.describe("Quiz Timer (Hard Mode)", () => {
    test.beforeEach(async ({ quizHubPage }) => {
      await quizHubPage.goto();
      await quizHubPage.selectAndStartQuiz("find_note", "hard");
    });

    // QUIZ-050
    test("should display countdown timer", async ({ quizActivePage }) => {
      await quizActivePage.waitForQuestion();

      const timerValue = await quizActivePage.getTimerValue();
      expect(timerValue).toBeTruthy();
    });

    // QUIZ-053
    test("should show warning visual when timer is low", async ({ quizActivePage, page }) => {
      await quizActivePage.waitForQuestion();

      // Wait for timer to get low (but not timeout)
      await page.waitForTimeout(25000); // Wait 25 seconds of 30

      // Timer should have warning styling
      const timer = quizActivePage.timer;
      const hasWarningClass = await timer.evaluate((el) => {
        return el.classList.contains("warning") || el.classList.contains("text-red") || el.classList.contains("animate");
      });

      expect(hasWarningClass).toBe(true);
    });
  });

  test.describe("Quiz Results", () => {
    // QUIZ-060
    test("should display score and percentage after completion", async ({
      quizHubPage,
      quizActivePage,
      quizResultsPage,
      page,
    }) => {
      await quizHubPage.goto();
      await quizHubPage.selectAndStartQuiz("find_note", "easy");

      // Complete quiz quickly
      for (let i = 0; i < 10; i++) {
        await quizActivePage.waitForQuestion();
        await quizActivePage.clickFretboardPosition(3, 5); // Click same position
        await page.waitForTimeout(500);
        if (await quizActivePage.nextButton.isVisible()) {
          await quizActivePage.clickNext();
        }
      }

      await quizResultsPage.waitForResults();

      const score = await quizResultsPage.getScore();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);

      const message = await quizResultsPage.getMotivationalMessage();
      expect(message).toBeTruthy();
    });

    // QUIZ-062
    test("should return to quiz hub when clicking Play Again", async ({
      quizHubPage,
      quizActivePage,
      quizResultsPage,
      page,
    }) => {
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
      await quizResultsPage.clickPlayAgain();

      // Should be back at quiz hub
      await expect(quizHubPage.findNoteButton).toBeVisible();
    });
  });

  test.describe("Guest Data Non-Persistence", () => {
    test("should not persist quiz data after page reload for guest", async ({
      quizHubPage,
      quizActivePage,
      page,
    }) => {
      await quizHubPage.goto();
      await quizHubPage.selectAndStartQuiz("find_note", "easy");

      // Start answering
      await quizActivePage.waitForQuestion();
      await quizActivePage.clickFretboardPosition(3, 5);

      // Reload page
      await page.reload();

      // Should be back at quiz hub or home, not in active quiz
      await expect(page).not.toHaveURL(/quiz\/active/);
    });
  });
});
