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

export const getFretboardPositions = (fretRange: 12 | 24): FretPosition[] => {
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

type FretboardProps = {
  fretRange?: 12 | 24;
  showNoteNames?: boolean;
  highlightedPositions?: FretPosition[];
  selectedPositions?: FretPosition[];
  disabled?: boolean;
  onPositionClick?: (position: FretPosition) => void;
};

const Fretboard = ({
  fretRange = 12,
  showNoteNames = false,
  highlightedPositions = [],
  selectedPositions = [],
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

  const frets = Array.from({ length: fretRange + 1 }, (_, index) => index);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="grid grid-cols-[40px_repeat(var(--fret-count),minmax(0,1fr))] gap-2 text-[0.65rem] text-slate-400" style={{ ["--fret-count" as string]: frets.length }}>
        <div></div>
        {frets.map((fret) => (
          <div key={`fret-${fret}`} className="text-center">
            {fret}
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-2">
        {Array.from({ length: 6 }, (_, index) => 6 - index).map((stringNumber) => {
          const stringLabel = STRING_OPEN_NOTES[stringNumber];
          return (
            <div
              key={`string-${stringNumber}`}
              className="grid grid-cols-[40px_repeat(var(--fret-count),minmax(0,1fr))] gap-2"
              style={{ ["--fret-count" as string]: frets.length }}
            >
              <div className="flex items-center justify-center text-[0.65rem] text-slate-300">
                S{stringNumber} {stringLabel}
              </div>
              {frets.map((fret) => {
                const position = positions.find((pos) => pos.string === stringNumber && pos.fret === fret)!;
                const key = `${position.string}-${position.fret}`;
                const isHighlighted = highlightedSet.has(key);
                const isSelected = selectedSet.has(key);
                const showMarker = [3, 5, 7, 9, 12].includes(fret) && stringNumber === 3;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onPositionClick?.(position)}
                    disabled={disabled}
                    className={`relative flex h-10 items-center justify-center rounded-lg border text-[0.65rem] transition ${
                      isSelected
                        ? "border-emerald-400/70 bg-emerald-400/20 text-emerald-100"
                        : isHighlighted
                          ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                          : "border-white/10 bg-slate-900/40 text-slate-400 hover:border-emerald-300/40"
                    }`}
                    aria-label={`String ${position.string}, fret ${position.fret}, note ${position.note}`}
                  >
                    {showMarker ? (
                      <span className="absolute inset-0 flex items-center justify-center text-[0.45rem] text-slate-600">
                        ●
                      </span>
                    ) : null}
                    <span className="relative">{showNoteNames || isSelected || isHighlighted ? position.note : ""}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Fretboard;
