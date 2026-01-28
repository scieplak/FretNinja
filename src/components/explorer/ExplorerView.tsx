import { useCallback, useEffect, useMemo, useState } from "react";

import type { AIHintCommand, AIHintResponseDTO, ChordTypeEnum, NoteEnum } from "@/types";
import Fretboard, { getFretboardPositions } from "@/components/fretboard/Fretboard";

type PatternType = "scale" | "chord";

const ROOT_NOTES: NoteEnum[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALE_OPTIONS = ["Major Scale", "Natural Minor", "Pentatonic Major", "Pentatonic Minor"];
const CHORD_OPTIONS: { label: string; value: ChordTypeEnum }[] = [
  { label: "Major", value: "major" },
  { label: "Minor", value: "minor" },
  { label: "Diminished", value: "diminished" },
  { label: "Augmented", value: "augmented" },
];

// Scale intervals (semitones from root)
const SCALE_INTERVALS: Record<string, number[]> = {
  "Major Scale": [0, 2, 4, 5, 7, 9, 11],      // W-W-H-W-W-W-H
  "Natural Minor": [0, 2, 3, 5, 7, 8, 10],    // W-H-W-W-H-W-W
  "Pentatonic Major": [0, 2, 4, 7, 9],        // 1-2-3-5-6
  "Pentatonic Minor": [0, 3, 5, 7, 10],       // 1-b3-4-5-b7
};

// Chord intervals (semitones from root)
const CHORD_INTERVALS: Record<ChordTypeEnum, number[]> = {
  major: [0, 4, 7],       // 1-3-5
  minor: [0, 3, 7],       // 1-b3-5
  diminished: [0, 3, 6],  // 1-b3-b5
  augmented: [0, 4, 8],   // 1-3-#5
};

// Get notes in a scale or chord
const getPatternNotes = (root: NoteEnum, intervals: number[]): NoteEnum[] => {
  const rootIndex = ROOT_NOTES.indexOf(root);
  return intervals.map((interval) => ROOT_NOTES[(rootIndex + interval) % 12]);
};

const ExplorerView = () => {
  const [rootNote, setRootNote] = useState<NoteEnum>("C");
  const [patternType, setPatternType] = useState<PatternType>("scale");
  const [scale, setScale] = useState(SCALE_OPTIONS[0]);
  const [chordType, setChordType] = useState<ChordTypeEnum>("major");
  const [showNoteNames, setShowNoteNames] = useState(true);
  const [fretRange, setFretRange] = useState<12 | 24>(12);
  const [hint, setHint] = useState<AIHintResponseDTO | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("fn_explorer_state");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        rootNote?: NoteEnum;
        patternType?: PatternType;
        scale?: string;
        chordType?: ChordTypeEnum;
        showNoteNames?: boolean;
        fretRange?: 12 | 24;
      };
      if (parsed.rootNote) setRootNote(parsed.rootNote);
      if (parsed.patternType) setPatternType(parsed.patternType);
      if (parsed.scale) setScale(parsed.scale);
      if (parsed.chordType) setChordType(parsed.chordType);
      if (typeof parsed.showNoteNames === "boolean") setShowNoteNames(parsed.showNoteNames);
      if (parsed.fretRange === 12 || parsed.fretRange === 24) setFretRange(parsed.fretRange);
    } catch {
      // Ignore invalid stored data
    }
  }, []);

  useEffect(() => {
    const payload = {
      rootNote,
      patternType,
      scale,
      chordType,
      showNoteNames,
      fretRange,
    };
    localStorage.setItem("fn_explorer_state", JSON.stringify(payload));
  }, [rootNote, patternType, scale, chordType, showNoteNames, fretRange]);

  const handleHint = useCallback(async () => {
    setHint(null);
    setHintError(null);
    const token = localStorage.getItem("fn_access_token");
    if (!token) {
      setHintError("Sign in to access AI hints.");
      return;
    }

    setIsLoadingHint(true);
    try {
      const payload: AIHintCommand = {
        context: "explorer",
        target_root_note: rootNote,
        target_chord_type: patternType === "chord" ? chordType : null,
      };
      const response = await fetch("/api/ai/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setHintError("Hint unavailable right now. Please try again.");
        return;
      }

      const data = (await response.json()) as AIHintResponseDTO;
      setHint(data);
    } catch (error) {
      setHintError("Network error. Please check your connection.");
    } finally {
      setIsLoadingHint(false);
    }
  }, [chordType, patternType, rootNote]);

  const overlayLabel = useMemo(() => {
    return patternType === "scale" ? `${rootNote} ${scale}` : `${rootNote} ${chordType}`;
  }, [patternType, rootNote, scale, chordType]);

  const highlightedPositions = useMemo(() => {
    const positions = getFretboardPositions(fretRange);

    // Get the pattern notes based on scale or chord
    const intervals = patternType === "scale"
      ? SCALE_INTERVALS[scale] || SCALE_INTERVALS["Major Scale"]
      : CHORD_INTERVALS[chordType] || CHORD_INTERVALS.major;

    const patternNotes = getPatternNotes(rootNote, intervals);
    const patternNoteSet = new Set(patternNotes);

    return positions.filter((pos) => patternNoteSet.has(pos.note));
  }, [fretRange, rootNote, patternType, scale, chordType]);

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]" data-testid="explorer-view">
      <section className="space-y-4">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Explorer mode</p>
          <h1 className="text-2xl font-semibold text-white" data-testid="explorer-heading">Explore notes, scales, and chords</h1>
          <p className="text-sm text-slate-300">Click around the fretboard to see every pattern on the neck.</p>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6" data-testid="explorer-fretboard-section">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Overlay</p>
              <p className="text-white" data-testid="explorer-overlay-label">{overlayLabel}</p>
            </div>
            <button
              type="button"
              onClick={handleHint}
              data-testid="explorer-hint-button"
              className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              {isLoadingHint ? "Loading hint..." : "Get AI hint"}
            </button>
          </div>

          <div className="mt-6" data-testid="explorer-fretboard-container">
            <Fretboard
              fretRange={fretRange}
              showNoteNames={showNoteNames}
              highlightedPositions={highlightedPositions}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span>Root notes highlighted in purple</span>
            <span>Pattern notes highlighted in green</span>
          </div>
        </div>

        {hintError ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-6 py-4 text-sm text-rose-200" data-testid="explorer-hint-error">
            {hintError}
          </div>
        ) : null}

        {hint ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-4 text-sm text-emerald-100" data-testid="explorer-hint-result">
            <p className="font-semibold">Tip</p>
            <p className="mt-2 text-slate-100" data-testid="explorer-hint-text">{hint.hint}</p>
            <p className="mt-3 text-xs text-slate-200" data-testid="explorer-hint-memorization">Memorization: {hint.memorization_tip}</p>
          </div>
        ) : null}
      </section>

      <aside className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6" data-testid="explorer-controls">
        <div data-testid="explorer-root-note-section">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Root note</p>
          <div className="mt-3 grid grid-cols-6 gap-2" data-testid="explorer-root-note-grid">
            {ROOT_NOTES.map((note) => (
              <button
                key={note}
                type="button"
                onClick={() => setRootNote(note)}
                data-testid={`explorer-root-note-${note}`}
                className={`rounded-lg border px-2 py-2 text-xs transition ${
                  note === rootNote
                    ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                    : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-emerald-300/40"
                }`}
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2" data-testid="explorer-pattern-type-toggle">
          <button
            type="button"
            onClick={() => setPatternType("scale")}
            data-testid="explorer-scales-button"
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
              patternType === "scale"
                ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                : "border-white/10 bg-slate-950/60 text-slate-300"
            }`}
          >
            Scales
          </button>
          <button
            type="button"
            onClick={() => setPatternType("chord")}
            data-testid="explorer-chords-button"
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
              patternType === "chord"
                ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                : "border-white/10 bg-slate-950/60 text-slate-300"
            }`}
          >
            Chords
          </button>
        </div>

        {patternType === "scale" ? (
          <div data-testid="explorer-scale-section">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Scale</p>
            <div className="mt-3 space-y-2" data-testid="explorer-scale-options">
              {SCALE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setScale(option)}
                  data-testid={`explorer-scale-${option.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                    scale === option
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                      : "border-white/10 bg-slate-950/60 text-slate-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div data-testid="explorer-chord-section">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Chord</p>
            <div className="mt-3 space-y-2" data-testid="explorer-chord-options">
              {CHORD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChordType(option.value)}
                  data-testid={`explorer-chord-${option.value}`}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                    chordType === option.value
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                      : "border-white/10 bg-slate-950/60 text-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3" data-testid="explorer-display-options">
          <button
            type="button"
            onClick={() => setShowNoteNames((prev) => !prev)}
            data-testid="explorer-toggle-note-names"
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-left text-xs text-slate-300"
          >
            {showNoteNames ? "Hide note names" : "Show note names"}
          </button>
          <button
            type="button"
            onClick={() => setFretRange((prev) => (prev === 12 ? 24 : 12))}
            data-testid="explorer-toggle-fret-range"
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-left text-xs text-slate-300"
          >
            Fret range: {fretRange} frets
          </button>
          <button
            type="button"
            onClick={() => setHint(null)}
            data-testid="explorer-clear-overlay"
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-left text-xs text-slate-300"
          >
            Clear overlay
          </button>
        </div>
      </aside>
    </div>
  );
};

export default ExplorerView;
