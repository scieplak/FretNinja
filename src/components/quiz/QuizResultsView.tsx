import { useEffect, useMemo, useState } from "react";

interface QuizResultsViewProps {
  mode: string;
  user: { id: string; email: string } | null;
}

interface ResultsPayload {
  mode: string;
  difficulty: string;
  score: number;
  total: number;
  timeTakenSeconds: number;
  answers: {
    questionNumber: number;
    prompt: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
  achievements?: { id: string; display_name: string }[];
}

const scoreMessage = (score: number, total: number) => {
  const ratio = score / total;
  if (ratio === 1) return "Perfect! 🎯";
  if (ratio >= 0.8) return "Great job!";
  if (ratio >= 0.6) return "Good effort!";
  return "Keep practicing!";
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const QuizResultsView = ({ mode, user }: QuizResultsViewProps) => {
  const [results, setResults] = useState<ResultsPayload | null>(null);
  const isGuest = !user;

  useEffect(() => {
    const stored = sessionStorage.getItem("fn_quiz_results");
    if (stored) {
      setResults(JSON.parse(stored) as ResultsPayload);
    }
  }, []);

  const missedQuestions = useMemo(() => {
    return results?.answers.filter((answer) => !answer.isCorrect) ?? [];
  }, [results]);

  if (!results) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-300">
        Loading your results...
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="quiz-results-view">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Quiz results</p>
        <h1 className="text-2xl font-semibold text-white" data-testid="quiz-results-score">
          {results.score}/{results.total} · {Math.round((results.score / results.total) * 100)}%
        </h1>
        <p className="text-sm text-slate-300" data-testid="quiz-results-message">
          {scoreMessage(results.score, results.total)}
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6" data-testid="quiz-results-summary">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-300">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mode</p>
            <p className="text-white" data-testid="quiz-results-mode">
              {mode.replace("-", " ")}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Difficulty</p>
            <p className="text-white" data-testid="quiz-results-difficulty">
              {results.difficulty}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Time taken</p>
            <p className="text-white" data-testid="quiz-results-time">
              {formatTime(results.timeTakenSeconds)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6" data-testid="quiz-results-breakdown">
        <h2 className="text-lg font-semibold text-white">Breakdown</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-300" data-testid="quiz-results-missed-questions">
          {missedQuestions.length === 0 ? (
            <p data-testid="quiz-results-perfect">You nailed every question. Nice work!</p>
          ) : (
            missedQuestions.map((answer) => (
              <div
                key={answer.questionNumber}
                className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3"
                data-testid={`quiz-results-missed-${answer.questionNumber}`}
              >
                <p className="text-white">Question {answer.questionNumber}</p>
                <p className="text-xs text-slate-400">{answer.prompt}</p>
                <p className="mt-2">Your answer: {answer.userAnswer || "—"}</p>
                <p className="text-emerald-200">Correct answer: {answer.correctAnswer || "—"}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {results.achievements && results.achievements.length > 0 ? (
        <section
          className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6"
          data-testid="quiz-results-achievements"
        >
          <h2 className="text-lg font-semibold text-white">Achievements earned</h2>
          <div className="mt-3 flex flex-wrap gap-3" data-testid="quiz-results-achievement-list">
            {results.achievements.map((achievement) => (
              <span
                key={achievement.id}
                data-testid={`quiz-achievement-${achievement.id}`}
                className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-xs text-emerald-100"
              >
                {achievement.display_name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-wrap items-center gap-4" data-testid="quiz-results-actions">
        <a
          href={`/quiz/${mode}?difficulty=${results.difficulty}`}
          data-testid="quiz-results-retry-button"
          className="rounded-lg bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300"
        >
          Retry same quiz
        </a>
        <a
          href="/quiz"
          data-testid="quiz-results-different-mode-link"
          className="text-sm text-slate-300 hover:text-emerald-200"
        >
          Try different mode
        </a>
        <a
          href="/dashboard"
          data-testid="quiz-results-dashboard-link"
          className="text-sm text-slate-300 hover:text-emerald-200"
        >
          Back to dashboard
        </a>
      </section>

      {isGuest ? (
        <div
          className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-4 text-sm text-emerald-100"
          data-testid="quiz-results-guest-prompt"
        >
          Create an account to save your progress and unlock achievements.
          <a
            href="/register"
            data-testid="quiz-results-register-link"
            className="ml-2 font-semibold text-white hover:text-emerald-200"
          >
            Register now
          </a>
        </div>
      ) : null}
    </div>
  );
};

export default QuizResultsView;
