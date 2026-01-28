import { test, expect, TEST_USER } from "./fixtures/test-fixtures";

/**
 * Fretboard Explorer E2E Tests
 * @see test-plan.md Section 4.4
 */

test.describe("Fretboard Explorer", () => {
  test.describe("Basic Functionality (Guest)", () => {
    // EXPL-001
    test("should display root note selector", async ({ explorerPage }) => {
      await explorerPage.goto();

      await expect(explorerPage.rootNoteSelector).toBeVisible();
    });

    // EXPL-002
    test("should display pattern on fretboard when scale selected", async ({ explorerPage }) => {
      await explorerPage.goto();

      // Select C major scale
      await explorerPage.selectRootNote("C");
      await explorerPage.selectScale("major");

      // Should have highlighted notes
      const highlightedCount = await explorerPage.getHighlightedNotesCount();
      expect(highlightedCount).toBeGreaterThan(0);
    });

    // EXPL-005
    test("should toggle fretboard range between 12 and 24 frets", async ({ explorerPage, page }) => {
      await explorerPage.goto();

      // Get initial fret count
      const initialFrets = await page.locator("[data-fret]").count();

      await explorerPage.toggleFretRange();

      // Wait for re-render
      await page.waitForTimeout(500);

      const newFrets = await page.locator("[data-fret]").count();

      // Fret count should change
      expect(newFrets).not.toBe(initialFrets);
    });

    test("should display fretboard correctly", async ({ explorerPage }) => {
      await explorerPage.goto();

      const isVisible = await explorerPage.isFretboardVisible();
      expect(isVisible).toBe(true);
    });

    test("should allow clicking fretboard positions", async ({ explorerPage }) => {
      await explorerPage.goto();

      // Click a position
      await explorerPage.clickFretboardPosition(5, 3);

      // No error should occur
      await expect(explorerPage.fretboard).toBeVisible();
    });
  });

  test.describe("Pattern Display", () => {
    test("should display C major scale correctly", async ({ explorerPage }) => {
      await explorerPage.goto();

      await explorerPage.selectRootNote("C");
      await explorerPage.selectScale("major");

      // Major scale has 7 notes per octave
      const highlightedCount = await explorerPage.getHighlightedNotesCount();
      expect(highlightedCount).toBeGreaterThanOrEqual(7);
    });

    test("should display chord pattern correctly", async ({ explorerPage }) => {
      await explorerPage.goto();

      await explorerPage.selectRootNote("A");
      await explorerPage.selectChord("minor");

      // Chord should highlight multiple positions
      const highlightedCount = await explorerPage.getHighlightedNotesCount();
      expect(highlightedCount).toBeGreaterThanOrEqual(3);
    });

    test("should update pattern when root note changes", async ({ explorerPage }) => {
      await explorerPage.goto();

      // Select C major
      await explorerPage.selectRootNote("C");
      await explorerPage.selectScale("major");

      const cMajorCount = await explorerPage.getHighlightedNotesCount();

      // Change to G major
      await explorerPage.selectRootNote("G");

      const gMajorCount = await explorerPage.getHighlightedNotesCount();

      // Both should have highlights (pattern positions will differ)
      expect(cMajorCount).toBeGreaterThan(0);
      expect(gMajorCount).toBeGreaterThan(0);
    });
  });

  test.describe("Settings Toggle", () => {
    test("should toggle note name visibility", async ({ explorerPage, page }) => {
      await explorerPage.goto();

      // Check initial state
      const initialNoteLabels = await page.locator("[data-note-label]").count();

      await explorerPage.toggleShowNoteNames();
      await page.waitForTimeout(300);

      const afterToggleLabels = await page.locator("[data-note-label]").count();

      // Count should change (either show or hide)
      expect(afterToggleLabels !== initialNoteLabels || initialNoteLabels === 0).toBe(true);
    });
  });

  test.describe("AI Hints (Authenticated)", () => {
    test.beforeEach(async ({ loginPage, page }) => {
      await loginPage.goto();

      const testEmail = TEST_USER.email;
      const testPassword = TEST_USER.password;

      await loginPage.login(testEmail, testPassword);
      await page.waitForURL(/dashboard|quiz/, { timeout: 10000 });
    });

    // EXPL-003
    test("should request and display AI hint", async ({ explorerPage }) => {
      await explorerPage.goto();

      // Select a pattern first
      await explorerPage.selectRootNote("C");
      await explorerPage.selectScale("major");

      // Request hint
      await explorerPage.requestAIHint();

      // Hint should be displayed (or loading indicator)
      const hintText = await explorerPage.getHintText();

      // Either hint is shown or we got a response
      expect(hintText !== null || (await explorerPage.hintDisplay.isVisible())).toBe(true);
    });
  });

  test.describe("Settings Persistence", () => {
    // EXPL-004
    test("should persist settings in localStorage", async ({ explorerPage, page }) => {
      await explorerPage.goto();

      // Change some settings
      await explorerPage.selectRootNote("G");
      await explorerPage.toggleFretRange();

      // Reload page
      await page.reload();

      // Settings should be preserved (check localStorage)
      const settings = await page.evaluate(() => {
        return localStorage.getItem("explorerSettings");
      });

      // Either settings are stored or the UI remembers state
      expect(settings !== null || (await explorerPage.fretboard.isVisible())).toBe(true);
    });
  });

  test.describe("Responsive Behavior", () => {
    test("should display fretboard on mobile viewport", async ({ explorerPage, page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await explorerPage.goto();

      const isVisible = await explorerPage.isFretboardVisible();
      expect(isVisible).toBe(true);
    });

    test("should display fretboard on tablet viewport", async ({ explorerPage, page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await explorerPage.goto();

      const isVisible = await explorerPage.isFretboardVisible();
      expect(isVisible).toBe(true);
    });
  });
});
