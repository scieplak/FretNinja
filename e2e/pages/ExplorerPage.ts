import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Fretboard Explorer page
 */
export class ExplorerPage extends BasePage {
  // Fretboard
  readonly fretboard: Locator;
  readonly fretboardNotes: Locator;

  // Root note selector (grid of note buttons)
  readonly rootNoteSelector: Locator;
  readonly rootNoteButtons: Locator;

  // Pattern type selector
  readonly scalesButton: Locator;
  readonly chordsButton: Locator;

  // Scale/Chord options
  readonly scaleOptions: Locator;
  readonly chordOptions: Locator;

  // Settings
  readonly fretRangeToggle: Locator;
  readonly showNoteNamesToggle: Locator;
  readonly clearOverlayButton: Locator;

  // AI Hint
  readonly requestHintButton: Locator;
  readonly hintDisplay: Locator;
  readonly hintError: Locator;

  // Highlighted notes
  readonly highlightedNotes: Locator;

  constructor(page: Page) {
    super(page);

    // Fretboard container using data-testid
    this.fretboard = page.getByTestId("explorer-fretboard-container");
    this.fretboardNotes = page.locator("[data-testid^='fretboard-position-']");

    // Root note selector using data-testid
    this.rootNoteSelector = page.getByTestId("explorer-root-note-section");
    this.rootNoteButtons = page.getByTestId("explorer-root-note-grid").locator("button");

    // Pattern type buttons using data-testid
    this.scalesButton = page.getByTestId("explorer-scales-button");
    this.chordsButton = page.getByTestId("explorer-chords-button");

    // Scale options using data-testid
    this.scaleOptions = page.getByTestId("explorer-scale-options").locator("button");

    // Chord options using data-testid
    this.chordOptions = page.getByTestId("explorer-chord-options").locator("button");

    // Settings toggles using data-testid
    this.fretRangeToggle = page.getByTestId("explorer-toggle-fret-range");
    this.showNoteNamesToggle = page.getByTestId("explorer-toggle-note-names");
    this.clearOverlayButton = page.getByTestId("explorer-clear-overlay");

    // AI hint using data-testid
    this.requestHintButton = page.getByTestId("explorer-hint-button");
    this.hintDisplay = page.getByTestId("explorer-hint-result");
    this.hintError = page.getByTestId("explorer-hint-error");

    // Highlighted notes on fretboard (amber/pulse styling)
    this.highlightedNotes = page.locator("[data-testid^='fretboard-position-'][class*='animate-pulse'], [data-testid^='fretboard-position-'][class*='amber']");
  }

  async goto(): Promise<void> {
    await this.page.goto("/explorer");
    await this.waitForPageLoad();
  }

  async selectRootNote(note: string): Promise<void> {
    await this.page.getByTestId(`explorer-root-note-${note}`).click();
  }

  async selectScales(): Promise<void> {
    await this.scalesButton.click();
  }

  async selectChords(): Promise<void> {
    await this.chordsButton.click();
  }

  async selectScale(scaleType: string): Promise<void> {
    await this.selectScales();
    // Map short names to full option names and convert to testid format
    // Options are: "Major Scale", "Natural Minor", "Pentatonic Major", "Pentatonic Minor"
    const scaleMap: Record<string, string> = {
      "major": "major-scale",
      "major scale": "major-scale",
      "minor": "natural-minor",
      "natural minor": "natural-minor",
      "pentatonic major": "pentatonic-major",
      "pentatonic minor": "pentatonic-minor",
    };
    const normalized = scaleType.toLowerCase();
    const testIdSuffix = scaleMap[normalized] || normalized.replace(/\s+/g, "-");
    await this.page.getByTestId(`explorer-scale-${testIdSuffix}`).click();
  }

  async selectChord(chordType: string): Promise<void> {
    await this.selectChords();
    // Convert chord type to testid format (e.g., "Major" -> "major")
    // Chord options use their value directly: major, minor, diminished, augmented
    const testIdSuffix = chordType.toLowerCase();
    await this.page.getByTestId(`explorer-chord-${testIdSuffix}`).click();
  }

  async toggleFretRange(): Promise<void> {
    await this.fretRangeToggle.click();
  }

  async toggleShowNoteNames(): Promise<void> {
    await this.showNoteNamesToggle.click();
  }

  async requestAIHint(): Promise<void> {
    await this.requestHintButton.click();
    // Wait for loading to complete
    await this.page.waitForFunction(
      () => !document.body.innerText.includes("Loading hint"),
      { timeout: 15000 }
    ).catch(() => {
      // May already be done
    });
  }

  async getHintText(): Promise<string | null> {
    if (await this.hintDisplay.isVisible()) {
      return this.hintDisplay.textContent();
    }
    return null;
  }

  async isHintErrorVisible(): Promise<boolean> {
    return this.hintError.isVisible();
  }

  async getHighlightedNotesCount(): Promise<number> {
    return this.highlightedNotes.count();
  }

  async clickFretboardPosition(fret: number, stringNum: number): Promise<void> {
    const note = this.page.getByTestId(`fretboard-position-s${stringNum}-f${fret}`);
    await note.click();
  }

  async isFretboardVisible(): Promise<boolean> {
    return this.fretboard.isVisible();
  }

  async getCurrentFretRange(): Promise<number> {
    const text = await this.fretRangeToggle.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 12;
  }
}
