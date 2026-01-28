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

    // Fretboard container
    this.fretboard = page.locator("div.rounded-2xl").filter({
      has: page.locator("button[aria-label*='String']"),
    });
    this.fretboardNotes = page.locator("button[aria-label*='String']");

    // Root note buttons in the aside panel
    this.rootNoteButtons = page.locator("aside button").filter({
      hasText: /^[A-G]#?$/,
    });

    // Pattern type buttons
    this.scalesButton = page.getByRole("button", { name: /^scales$/i });
    this.chordsButton = page.getByRole("button", { name: /^chords$/i });

    // Scale options
    this.scaleOptions = page.getByRole("button", { name: /major scale|natural minor|pentatonic/i });

    // Chord options
    this.chordOptions = page.getByRole("button", { name: /^(major|minor|diminished|augmented)$/i });

    // Settings toggles
    this.fretRangeToggle = page.getByRole("button", { name: /fret range/i });
    this.showNoteNamesToggle = page.getByRole("button", { name: /note names/i });
    this.clearOverlayButton = page.getByRole("button", { name: /clear overlay/i });

    // AI hint
    this.requestHintButton = page.getByRole("button", { name: /get ai hint|loading hint/i });
    this.hintDisplay = page.locator("div.border-emerald-400\\/30").filter({ hasText: /tip/i });
    this.hintError = page.locator("div.border-rose-500\\/40");

    // Highlighted notes on fretboard (amber/pulse styling)
    this.highlightedNotes = page.locator("button[class*='animate-pulse'], button[class*='amber']");
  }

  async goto(): Promise<void> {
    await this.page.goto("/explorer");
    await this.waitForPageLoad();
  }

  async selectRootNote(note: string): Promise<void> {
    await this.page.locator("aside").getByRole("button", { name: new RegExp(`^${note}$`) }).click();
  }

  async selectScales(): Promise<void> {
    await this.scalesButton.click();
  }

  async selectChords(): Promise<void> {
    await this.chordsButton.click();
  }

  async selectScale(scaleType: string): Promise<void> {
    await this.selectScales();
    await this.page.getByRole("button", { name: new RegExp(scaleType, "i") }).click();
  }

  async selectChord(chordType: string): Promise<void> {
    await this.selectChords();
    await this.page.getByRole("button", { name: new RegExp(`^${chordType}$`, "i") }).click();
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
    const note = this.page.locator(`button[aria-label*="String ${stringNum}"][aria-label*="fret ${fret}"]`);
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
