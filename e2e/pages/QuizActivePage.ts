import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the active Quiz view (during quiz)
 */
export class QuizActivePage extends BasePage {
  // Question display
  readonly questionText: Locator;
  readonly questionNumber: Locator;
  readonly progressIndicator: Locator;

  // Fretboard
  readonly fretboard: Locator;
  readonly fretboardNotes: Locator;

  // Timer (hard mode)
  readonly timer: Locator;

  // Answer options (for name_note, recognize_interval)
  readonly answerOptions: Locator;

  // Feedback
  readonly correctFeedback: Locator;
  readonly incorrectFeedback: Locator;

  // Navigation
  readonly nextButton: Locator;
  readonly submitButton: Locator;
  readonly abandonButton: Locator;

  // Score display
  readonly currentScore: Locator;

  constructor(page: Page) {
    super(page);

    // Question is displayed in h1 element
    this.questionText = page.locator("h1").first();
    // Question number is displayed as "Question X of Y"
    this.questionNumber = page.getByText(/question \d+ of \d+/i);
    this.progressIndicator = page.getByRole("progressbar");

    // Fretboard container and notes
    this.fretboard = page.locator(".rounded-2xl").filter({ has: page.locator("button[aria-label*='String']") });
    this.fretboardNotes = page.locator("button[aria-label*='String']");

    // Timer for hard mode
    this.timer = page.getByText(/\d+s left/);

    // Answer option buttons (for multiple choice questions)
    this.answerOptions = page.locator("section button").filter({ hasNot: page.getByText(/submit/i) });

    // Feedback messages
    this.correctFeedback = page.getByText(/^correct!?$/i);
    this.incorrectFeedback = page.getByText(/^incorrect!?$/i);

    // Navigation buttons
    this.nextButton = page.getByRole("button", { name: /next|continue/i });
    this.submitButton = page.getByRole("button", { name: /submit/i });
    this.abandonButton = page.getByRole("link", { name: /back to dashboard/i });

    this.currentScore = page.getByText(/score/i);
  }

  async goto(): Promise<void> {
    // Quiz active page is not directly navigable
    // You must start a quiz from QuizHubPage
    throw new Error("QuizActivePage cannot be navigated to directly. Start a quiz from QuizHubPage.");
  }

  async waitForQuestion(): Promise<void> {
    await this.questionText.waitFor({ state: "visible", timeout: 10000 });
  }

  async getQuestionText(): Promise<string | null> {
    return this.questionText.textContent();
  }

  async getCurrentQuestionNumber(): Promise<number> {
    const text = await this.questionNumber.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async clickFretboardPosition(fret: number, stringNum: number): Promise<void> {
    // Fretboard buttons use aria-label like "String 3, fret 5, note G"
    const note = this.page.locator(`button[aria-label*="String ${stringNum}"][aria-label*="fret ${fret}"]`);
    await note.click();
  }

  async selectAnswerOption(note: string): Promise<void> {
    await this.page.getByRole("button", { name: new RegExp(`^${note}$`, "i") }).click();
  }

  async getTimerValue(): Promise<string | null> {
    if (await this.timer.isVisible()) {
      return this.timer.textContent();
    }
    return null;
  }

  async isCorrectFeedbackVisible(): Promise<boolean> {
    return this.correctFeedback.isVisible();
  }

  async isIncorrectFeedbackVisible(): Promise<boolean> {
    return this.incorrectFeedback.isVisible();
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  async abandonQuiz(): Promise<void> {
    await this.abandonButton.click();
  }

  async waitForFeedback(): Promise<"correct" | "incorrect"> {
    // Wait for feedback message to appear
    await this.page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return text.includes("correct") || text.includes("incorrect");
      },
      { timeout: 5000 }
    );

    if (await this.correctFeedback.isVisible()) {
      return "correct";
    }
    return "incorrect";
  }

  async getHighlightedPositions(): Promise<Array<{ fret: number; string: number }>> {
    // Look for buttons with amber/highlight styling (pulse animation)
    const highlighted = this.page.locator("button[class*='animate-pulse'], button[class*='amber']");
    const count = await highlighted.count();
    const positions: Array<{ fret: number; string: number }> = [];

    for (let i = 0; i < count; i++) {
      const el = highlighted.nth(i);
      const ariaLabel = await el.getAttribute("aria-label");
      if (ariaLabel) {
        const stringMatch = ariaLabel.match(/String (\d+)/);
        const fretMatch = ariaLabel.match(/fret (\d+)/);
        if (stringMatch && fretMatch) {
          positions.push({
            fret: parseInt(fretMatch[1], 10),
            string: parseInt(stringMatch[1], 10),
          });
        }
      }
    }

    return positions;
  }

  async answerQuestionByClickingFretboard(fret: number, string: number): Promise<void> {
    await this.clickFretboardPosition(fret, string);
    await this.waitForFeedback();
  }

  async submitAnswer(): Promise<void> {
    await this.submitButton.click();
  }
}
