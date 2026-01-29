import { useMemo } from "react";

import type { NoteEnum } from "@/types";

export type FretPosition = {
  string: number;
  fret: number;
  note: NoteEnum;
};

const NOTES: NoteEnum[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const STRING_OPEN_NOTES: Record<number, NoteEnum> = {
  6: "E",
  5: "A",
  4: "D",
  3: "G",
  2: "B",
  1: "E",
};

const getNoteIndex = (note: NoteEnum) => NOTES.indexOf(note);

export const getFretboardPositions = (fretRange: number): FretPosition[] => {
  const positions: FretPosition[] = [];
  for (let string = 6; string >= 1; string -= 1) {
    const openNote = STRING_OPEN_NOTES[string];
    const openIndex = getNoteIndex(openNote);
    for (let fret = 0; fret <= fretRange; fret += 1) {
      const note = NOTES[(openIndex + fret) % NOTES.length];
      positions.push({ string, fret, note });
    }
  }
  return positions;
};

// Fret markers: single dots at 3, 5, 7, 9, 15, 17, 19, 21 and double dots at 12, 24
const SINGLE_MARKERS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_MARKERS = [12, 24];

type FretboardProps = {
  fretRange?: number;
  showNoteNames?: boolean;
  hideHighlightedNames?: boolean; // Hide note names on highlighted positions (for "name the note" quiz)
  highlightedPositions?: FretPosition[];
  rootPositions?: FretPosition[]; // Root notes get special styling (purple) in explorer mode
  selectedPositions?: FretPosition[];
  correctPositions?: FretPosition[];
  incorrectPositions?: FretPosition[];
  disabled?: boolean;
  onPositionClick?: (position: FretPosition) => void;
};

const Fretboard = ({
  fretRange = 12,
  showNoteNames = false,
  hideHighlightedNames = false,
  highlightedPositions = [],
  rootPositions = [],
  selectedPositions = [],
  correctPositions = [],
  incorrectPositions = [],
  disabled = false,
  onPositionClick,
}: FretboardProps) => {
  const positions = useMemo(() => getFretboardPositions(fretRange), [fretRange]);

  const highlightedSet = useMemo(
    () => new Set(highlightedPositions.map((pos) => `${pos.string}-${pos.fret}`)),
    [highlightedPositions]
  );

  const selectedSet = useMemo(
    () => new Set(selectedPositions.map((pos) => `${pos.string}-${pos.fret}`)),
    [selectedPositions]
  );

  const correctSet = useMemo(
    () => new Set(correctPositions.map((pos) => `${pos.string}-${pos.fret}`)),
    [correctPositions]
  );

  const incorrectSet = useMemo(
    () => new Set(incorrectPositions.map((pos) => `${pos.string}-${pos.fret}`)),
    [incorrectPositions]
  );

  const rootSet = useMemo(
    () => new Set(rootPositions.map((pos) => `${pos.string}-${pos.fret}`)),
    [rootPositions]
  );

  const frets = Array.from({ length: fretRange + 1 }, (_, index) => index);
  const strings = [1, 2, 3, 4, 5, 6]; // High E to Low E (top to bottom, like tablature)

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-amber-950/40 to-amber-900/20 p-4 overflow-x-auto" data-testid="fretboard">
      {/* Fret numbers */}
      <div className="flex mb-1 ml-12">
        {frets.map((fret) => (
          <div
            key={`fret-num-${fret}`}
            className={`flex-1 text-center text-[0.6rem] min-w-[40px] ${
              fret === 0 ? "text-slate-400 font-medium" : "text-slate-500"
            }`}
          >
            {fret === 0 ? "Open" : fret}
          </div>
        ))}
      </div>

      {/* Fretboard body */}
      <div className="relative">

        {/* Fret markers (dots) */}
        <div className="absolute left-12 right-0 top-0 bottom-0 flex pointer-events-none">
          {frets.map((fret) => {
            if (fret === 0) return <div key={`marker-space-${fret}`} className="flex-1 min-w-[40px]" />;
            const isSingle = SINGLE_MARKERS.includes(fret);
            const isDouble = DOUBLE_MARKERS.includes(fret);
            return (
              <div key={`marker-${fret}`} className="flex-1 min-w-[40px] flex items-center justify-center">
                {isSingle && (
                  <div className="w-3 h-3 rounded-full bg-slate-600/50" />
                )}
                {isDouble && (
                  <div className="flex flex-col gap-8">
                    <div className="w-3 h-3 rounded-full bg-slate-600/50" />
                    <div className="w-3 h-3 rounded-full bg-slate-600/50" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Strings and fret positions */}
        {strings.map((stringNumber) => {
          const stringLabel = STRING_OPEN_NOTES[stringNumber];
          // String thickness: bass strings thicker
          const thickness = stringNumber >= 4 ? "h-[3px]" : stringNumber >= 2 ? "h-[2px]" : "h-[1.5px]";

          return (
            <div key={`string-${stringNumber}`} className="flex items-center h-10 relative">
              {/* String label */}
              <div className="w-12 flex items-center justify-center text-[0.65rem] text-slate-400 font-medium">
                {stringLabel}
              </div>

              {/* String line (horizontal) */}
              <div
                className={`absolute left-12 right-0 ${thickness} bg-gradient-to-r from-slate-300 to-slate-400 z-[1] pointer-events-none`}
                style={{ top: "50%" }}
              />

              {/* Fret positions */}
              <div className="flex flex-1 relative z-[2]">
                {frets.map((fret) => {
                  const position = positions.find(
                    (pos) => pos.string === stringNumber && pos.fret === fret
                  )!;
                  const key = `${position.string}-${position.fret}`;
                  const isHighlighted = highlightedSet.has(key);
                  const isRoot = rootSet.has(key);
                  const isSelected = selectedSet.has(key);
                  const isCorrect = correctSet.has(key);
                  const isIncorrect = incorrectSet.has(key);
                  const showNote = showNoteNames || isSelected || (isHighlighted && !hideHighlightedNames) || isRoot || isCorrect || isIncorrect;

                  return (
                    <div
                      key={key}
                      className={`flex-1 min-w-[40px] flex items-center justify-center relative ${
                        fret === 0 ? "bg-slate-900/40" : ""
                      }`}
                    >
                      {/* Nut bar - at the RIGHT edge of fret 0 (between open strings and fret 1) */}
                      {fret === 0 && (
                        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-slate-200 rounded-sm z-10" />
                      )}

                      {/* Fret bar (vertical line) - on frets 1+ */}
                      {fret > 0 && (
                        <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-slate-500/60" />
                      )}

                      {/* Clickable note position */}
                      <button
                        type="button"
                        onClick={() => onPositionClick?.(position)}
                        disabled={disabled}
                        data-testid={`fretboard-position-s${position.string}-f${position.fret}`}
                        data-note={position.note}
                        data-string={position.string}
                        data-fret={position.fret}
                        data-feedback={isCorrect ? "correct" : isIncorrect ? "incorrect" : undefined}
                        className={`
                          relative w-7 h-7 rounded-full flex items-center justify-center
                          text-[0.6rem] font-semibold transition-all duration-150
                          ${
                            isCorrect
                              ? "correct bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 scale-110"
                              : isIncorrect
                                ? "incorrect bg-rose-500 text-white shadow-lg shadow-rose-500/50 scale-110"
                                : isSelected
                                  ? "bg-purple-500 text-white shadow-lg shadow-purple-500/50 scale-105"
                                  : isRoot
                                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/50 scale-105 ring-1 ring-violet-400/50"
                                    : isHighlighted
                                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 ring-1 ring-emerald-300/50"
                                      : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white hover:scale-105"
                          }
                          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                        `}
                        aria-label={`String ${position.string}, fret ${position.fret}${showNote ? `, note ${position.note}` : ""}`}
                      >
                        {showNote ? position.note : ""}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* String labels legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-[0.6rem] text-slate-500">
        <span>High e (1st) at top</span>
        <span>•</span>
        <span>Low E (6th) at bottom</span>
        <span>•</span>
        <span>Like TAB notation</span>
      </div>
    </div>
  );
};

export default Fretboard;
