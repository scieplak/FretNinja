import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export type QuizType = "find_note" | "name_note" | "mark_chord" | "recognize_interval";
export type Difficulty = "easy" | "medium" | "hard";

/**
 * Page Object for the Quiz Hub (mode and difficulty selection)
 */
export class QuizHubPage extends BasePage {
  // Quiz type buttons
  readonly findNoteButton: Locator;
  readonly nameNoteButton: Locator;
  readonly markChordButton: Locator;
  readonly recognizeIntervalButton: Locator;

  // Difficulty buttons
  readonly easyButton: Locator;
  readonly mediumButton: Locator;
  readonly hardButton: Locator;

  // Start button
  readonly startQuizButton: Locator;

  // Timer warning for hard mode
  readonly timerWarning: Locator;

  constructor(page: Page) {
    super(page);

    // Quiz type selection
    this.findNoteButton = page.getByRole("button", { name: /find.*note/i });
    this.nameNoteButton = page.getByRole("button", { name: /name.*note/i });
    this.markChordButton = page.getByRole("button", { name: /mark.*chord/i });
    this.recognizeIntervalButton = page.getByRole("button", { name: /recognize.*interval/i });

    // Difficulty selection
    this.easyButton = page.getByRole("button", { name: /easy/i });
    this.mediumButton = page.getByRole("button", { name: /medium/i });
    this.hardButton = page.getByRole("button", { name: /hard/i });

    // Start
    this.startQuizButton = page.getByRole("button", { name: /start/i });
    this.timerWarning = page.getByText(/timer|time limit|30.*second/i);
  }

  async goto(): Promise<void> {
    await this.page.goto("/quiz");
    await this.waitForPageLoad();
  }

  async selectQuizType(type: QuizType): Promise<void> {
    const buttonMap: Record<QuizType, Locator> = {
      find_note: this.findNoteButton,
      name_note: this.nameNoteButton,
      mark_chord: this.markChordButton,
      recognize_interval: this.recognizeIntervalButton,
    };
    await buttonMap[type].click();
  }

  async selectDifficulty(difficulty: Difficulty): Promise<void> {
    const buttonMap: Record<Difficulty, Locator> = {
      easy: this.easyButton,
      medium: this.mediumButton,
      hard: this.hardButton,
    };
    await buttonMap[difficulty].click();
  }

  async startQuiz(): Promise<void> {
    await this.startQuizButton.click();
  }

  async isStartButtonEnabled(): Promise<boolean> {
    return this.startQuizButton.isEnabled();
  }

  async isTimerWarningVisible(): Promise<boolean> {
    return this.timerWarning.isVisible();
  }

  async selectAndStartQuiz(type: QuizType, difficulty: Difficulty): Promise<void> {
    await this.selectQuizType(type);
    await this.selectDifficulty(difficulty);
    await this.startQuiz();
  }
}
