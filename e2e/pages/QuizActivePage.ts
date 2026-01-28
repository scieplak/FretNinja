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

    // Question is displayed in h1 element with data-testid
    this.questionText = page.getByTestId("quiz-question-prompt");
    // Question number is displayed as "Question X of Y"
    this.questionNumber = page.getByTestId("quiz-question-counter");
    this.progressIndicator = page.getByRole("progressbar");

    // Fretboard container and notes
    this.fretboard = page.getByTestId("quiz-fretboard-section");
    this.fretboardNotes = page.locator("[data-testid^='fretboard-position-']");

    // Timer for hard mode (container, not the value span)
    this.timer = page.getByTestId("quiz-timer");

    // Answer option buttons (for multiple choice questions)
    this.answerOptions = page.getByTestId("quiz-answer-options").locator("button");

    // Feedback messages
    this.correctFeedback = page.getByTestId("quiz-feedback-correct");
    this.incorrectFeedback = page.getByTestId("quiz-feedback-incorrect");

    // Navigation buttons
    this.nextButton = page.getByRole("button", { name: /next|continue/i });
    this.submitButton = page.getByTestId("quiz-submit-answer-button");
    this.abandonButton = page.getByTestId("quiz-abandon-button");

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
    // Fretboard buttons use data-testid like "fretboard-position-s3-f5"
    const note = this.page.getByTestId(`fretboard-position-s${stringNum}-f${fret}`);
    await note.click();
  }

  async selectAnswerOption(note: string): Promise<void> {
    await this.page.getByRole("button", { name: new RegExp(`^${note}$`, "i") }).click();
  }

  async getTimerValue(): Promise<string | null> {
    if (await this.timer.isVisible()) {
      // Read specifically from the value span
      const valueSpan = this.page.getByTestId("quiz-timer-value");
      return valueSpan.textContent();
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
    const highlighted = this.page.locator("[data-testid^='fretboard-position-'][class*='animate-pulse'], [data-testid^='fretboard-position-'][class*='amber']");
    const count = await highlighted.count();
    const positions: Array<{ fret: number; string: number }> = [];

    for (let i = 0; i < count; i++) {
      const el = highlighted.nth(i);
      const stringVal = await el.getAttribute("data-string");
      const fretVal = await el.getAttribute("data-fret");
      if (stringVal && fretVal) {
        positions.push({
          fret: parseInt(fretVal, 10),
          string: parseInt(stringVal, 10),
        });
      }
    }

    return positions;
  }

  async answerQuestionByClickingFretboard(fret: number, string: number): Promise<void> {
    await this.clickFretboardPosition(fret, string);
    await this.waitForFeedback();
  }

  async submitAnswer(): Promise<void> {
    // Try the answer submit button first, then chord submit button
    const answerBtn = this.page.getByTestId("quiz-submit-answer-button");
    const chordBtn = this.page.getByTestId("quiz-submit-chord-button");

    if (await answerBtn.isVisible()) {
      await answerBtn.click();
    } else if (await chordBtn.isVisible()) {
      await chordBtn.click();
    } else {
      // Fallback to the standard submit button
      await this.submitButton.click();
    }
  }
}
