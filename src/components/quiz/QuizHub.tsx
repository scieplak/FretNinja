import { useCallback, useId, useState } from "react";

type QuizMode = {
  id: "find-note" | "name-note" | "mark-chord" | "recognize-interval";
  title: string;
  description: string;
};

type Difficulty = "easy" | "medium" | "hard";

const MODES: QuizMode[] = [
  {
    id: "find-note",
    title: "Find the Note",
    description: "Click the fretboard to find the displayed note.",
  },
  {
    id: "name-note",
    title: "Name the Note",
    description: "Identify the note at the highlighted position.",
  },
  {
    id: "mark-chord",
    title: "Mark the Chord",
    description: "Mark all notes that form the displayed chord.",
  },
  {
    id: "recognize-interval",
    title: "Recognize the Interval",
    description: "Identify the interval between two notes.",
  },
];

const DIFFICULTIES: { id: Difficulty; title: string; description: string }[] = [
  { id: "easy", title: "Easy", description: "Strings 1-3 only, no time limit." },
  { id: "medium", title: "Medium", description: "Full fretboard (frets 0-12), no time limit." },
  { id: "hard", title: "Hard", description: "Full fretboard, 30-second timer per question." },
];

const QuizHub = () => {
  const modeGroupId = useId();
  const difficultyGroupId = useId();

  const [selectedMode, setSelectedMode] = useState<QuizMode["id"] | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);

  const handleStart = useCallback(() => {
    if (!selectedMode || !selectedDifficulty) {
      return;
    }
    window.location.href = `/quiz/${selectedMode}?difficulty=${selectedDifficulty}`;
  }, [selectedMode, selectedDifficulty]);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Quiz hub</p>
        <h1 className="text-2xl font-semibold text-white">Choose your challenge</h1>
        <p className="text-sm text-slate-300">Select a mode and difficulty before starting your session.</p>
      </header>

      <section aria-labelledby={modeGroupId} role="radiogroup" className="space-y-4">
        <h2 id={modeGroupId} className="text-lg font-semibold text-white">
          Quiz mode
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {MODES.map((mode) => {
            const isSelected = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`quiz-mode-${mode.id}`}
                onClick={() => setSelectedMode(mode.id)}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  isSelected
                    ? "border-emerald-400/60 bg-emerald-400/10"
                    : "border-white/10 bg-white/5 hover:border-emerald-300/40"
                }`}
              >
                <h3 className="text-lg font-semibold text-white">{mode.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{mode.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby={difficultyGroupId} role="radiogroup" className="space-y-4">
        <h2 id={difficultyGroupId} className="text-lg font-semibold text-white">
          Select difficulty
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {DIFFICULTIES.map((difficulty) => {
            const isSelected = selectedDifficulty === difficulty.id;
            return (
              <button
                key={difficulty.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`quiz-difficulty-${difficulty.id}`}
                onClick={() => setSelectedDifficulty(difficulty.id)}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  isSelected
                    ? "border-emerald-400/60 bg-emerald-400/10"
                    : "border-white/10 bg-white/5 hover:border-emerald-300/40"
                }`}
              >
                <h3 className="text-base font-semibold text-white">{difficulty.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{difficulty.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleStart}
          disabled={!selectedMode || !selectedDifficulty}
          data-testid="quiz-start-button"
          className="rounded-lg bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Start quiz
        </button>
        <a href="/dashboard" className="text-sm text-slate-300 hover:text-emerald-200">
          Back to dashboard
        </a>
      </div>
    </div>
  );
};

export default QuizHub;
