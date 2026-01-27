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
    return positions.filter((pos) => pos.note === rootNote);
  }, [fretRange, rootNote]);

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-4">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Explorer mode</p>
          <h1 className="text-2xl font-semibold text-white">Explore notes, scales, and chords</h1>
          <p className="text-sm text-slate-300">Click around the fretboard to see every pattern on the neck.</p>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Overlay</p>
              <p className="text-white">{overlayLabel}</p>
            </div>
            <button
              type="button"
              onClick={handleHint}
              className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              {isLoadingHint ? "Loading hint..." : "Get AI hint"}
            </button>
          </div>

          <div className="mt-6">
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
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">
            {hintError}
          </div>
        ) : null}

        {hint ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-4 text-sm text-emerald-100">
            <p className="font-semibold">Tip</p>
            <p className="mt-2 text-slate-100">{hint.hint}</p>
            <p className="mt-3 text-xs text-slate-200">Memorization: {hint.memorization_tip}</p>
          </div>
        ) : null}
      </section>

      <aside className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Root note</p>
          <div className="mt-3 grid grid-cols-6 gap-2">
            {ROOT_NOTES.map((note) => (
              <button
                key={note}
                type="button"
                onClick={() => setRootNote(note)}
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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPatternType("scale")}
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
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Scale</p>
            <div className="mt-3 space-y-2">
              {SCALE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setScale(option)}
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
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Chord</p>
            <div className="mt-3 space-y-2">
              {CHORD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChordType(option.value)}
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

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowNoteNames((prev) => !prev)}
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-left text-xs text-slate-300"
          >
            {showNoteNames ? "Hide note names" : "Show note names"}
          </button>
          <button
            type="button"
            onClick={() => setFretRange((prev) => (prev === 12 ? 24 : 12))}
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-left text-xs text-slate-300"
          >
            Fret range: {fretRange} frets
          </button>
          <button
            type="button"
            onClick={() => setHint(null)}
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
