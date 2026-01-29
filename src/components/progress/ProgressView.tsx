import { useEffect, useState } from "react";

import type { NoteMasteryResponseDTO, QuizSessionListDTO, QuizTypeEnum, StatsOverviewDTO, NoteEnum } from "@/types";

interface ProgressViewProps {
  user: { id: string; email: string } | null;
}

type TabKey = "mastery" | "stats" | "history";

const QUIZ_TYPE_LABELS: Record<QuizTypeEnum, string> = {
  find_note: "Find Note",
  name_note: "Name Note",
  mark_chord: "Mark Chord",
  recognize_interval: "Recognize Interval",
};

const NOTE_ORDER: NoteEnum[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const formatHours = (seconds?: number | null) => {
  if (!seconds) return "0.0";
  return (seconds / 3600).toFixed(1);
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const getAccuracyColor = (accuracy: number) => {
  if (accuracy >= 80) return "bg-emerald-500";
  if (accuracy >= 60) return "bg-emerald-400";
  if (accuracy >= 40) return "bg-yellow-400";
  if (accuracy >= 20) return "bg-orange-400";
  return "bg-rose-500";
};

const getAccuracyBorder = (accuracy: number) => {
  if (accuracy >= 80) return "border-emerald-500/60";
  if (accuracy >= 60) return "border-emerald-400/60";
  if (accuracy >= 40) return "border-yellow-400/60";
  if (accuracy >= 20) return "border-orange-400/60";
  return "border-rose-500/60";
};

const ProgressView = ({ user }: ProgressViewProps) => {
  const isGuest = !user;

  const [tab, setTab] = useState<TabKey>("mastery");
  const [stats, setStats] = useState<StatsOverviewDTO | null>(null);
  const [noteMastery, setNoteMastery] = useState<NoteMasteryResponseDTO | null>(null);
  const [sessions, setSessions] = useState<QuizSessionListDTO | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(!isGuest);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isGuest) {
      setErrorMessage("Sign in to view your progress.");
      setIsLoading(false);
      return;
    }

    let active = true;
    const fetchOptions: RequestInit = { credentials: "include" };

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [statsRes, masteryRes, sessionsRes] = await Promise.all([
          fetch("/api/stats/overview", fetchOptions),
          fetch("/api/stats/note-mastery", fetchOptions),
          fetch(`/api/quiz-sessions?page=${page}&limit=20`, fetchOptions),
        ]);

        if (!active) return;

        setStats(statsRes.ok ? ((await statsRes.json()) as StatsOverviewDTO) : null);
        setNoteMastery(masteryRes.ok ? ((await masteryRes.json()) as NoteMasteryResponseDTO) : null);
        setSessions(sessionsRes.ok ? ((await sessionsRes.json()) as QuizSessionListDTO) : null);
      } catch {
        if (!active) return;
        setErrorMessage("Unable to load progress data. Please try again.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [page, isGuest]);

  const totalPages = sessions?.pagination.total_pages ?? 1;

  const sortedNotes = NOTE_ORDER.map((note) => {
    const item = noteMastery?.data.find((d) => d.note === note);
    return item ?? { note, total_attempts: 0, correct_count: 0, error_count: 0, accuracy: 0 };
  });

  return (
    <div className="space-y-8" data-testid="progress-view">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Progress</p>
        <h1 className="text-2xl font-semibold text-white" data-testid="progress-heading">
          Track your learning progress
        </h1>
        <p className="text-sm text-slate-300">Review note mastery, stats, and session history in one place.</p>
      </header>

      {errorMessage ? (
        <div
          className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-6 py-4 text-sm text-rose-200"
          data-testid="progress-error-message"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2" data-testid="progress-tabs">
        {(["mastery", "stats", "history"] as TabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            data-testid={`progress-tab-${key}`}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
              tab === key
                ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                : "border-white/10 bg-white/5 text-slate-300"
            }`}
            aria-selected={tab === key}
            role="tab"
          >
            {key === "mastery" ? "Note Mastery" : key}
          </button>
        ))}
      </div>

      {tab === "mastery" ? (
        <section className="space-y-6" data-testid="progress-mastery-section">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6" data-testid="progress-mastery-container">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Note Mastery</h2>
                <p className="text-sm text-slate-300">
                  {isLoading
                    ? "Loading..."
                    : noteMastery
                      ? `${noteMastery.overall_accuracy}% overall accuracy · ${noteMastery.total_attempts} total attempts`
                      : "No data yet"}
                </p>
              </div>
            </div>

            <div
              className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-12"
              data-testid="progress-mastery-grid"
            >
              {sortedNotes.map((item) => (
                <div
                  key={item.note}
                  data-testid={`progress-mastery-note-${item.note}`}
                  className={`group relative flex flex-col items-center rounded-xl border p-3 transition ${
                    item.total_attempts > 0 ? getAccuracyBorder(item.accuracy) : "border-white/10"
                  }`}
                >
                  <span className="text-lg font-bold text-white">{item.note}</span>
                  {item.total_attempts > 0 ? (
                    <>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-700">
                        <div
                          className={`h-full rounded-full ${getAccuracyColor(item.accuracy)}`}
                          style={{ width: `${item.accuracy}%` }}
                        />
                      </div>
                      <span className="mt-1 text-xs text-slate-400">{item.accuracy}%</span>
                    </>
                  ) : (
                    <span className="mt-2 text-xs text-slate-500">No data</span>
                  )}

                  {/* Tooltip */}
                  <div className="pointer-events-none absolute -top-16 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-200 shadow-lg group-hover:block">
                    <p className="font-semibold">{item.note}</p>
                    <p>
                      {item.correct_count}/{item.total_attempts} correct
                    </p>
                    <p>{item.error_count} errors</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>80%+</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <span>60-79%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <span>40-59%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-400" />
                <span>20-39%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <span>&lt;20%</span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "stats" ? (
        <section className="space-y-6" data-testid="progress-stats-section">
          <div className="grid gap-4 sm:grid-cols-3" data-testid="progress-stats-summary">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5" data-testid="progress-total-quizzes">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total quizzes</p>
              <p className="mt-2 text-2xl font-semibold text-white" data-testid="progress-total-quizzes-value">
                {isLoading ? "—" : (stats?.total_quizzes ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5" data-testid="progress-practice-time">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Practice time</p>
              <p className="mt-2 text-2xl font-semibold text-white" data-testid="progress-practice-time-value">
                {isLoading ? "—" : `${formatHours(stats?.total_time_seconds)} hrs`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5" data-testid="progress-current-streak">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current streak</p>
              <p className="mt-2 text-2xl font-semibold text-white" data-testid="progress-current-streak-value">
                {isLoading ? "—" : (stats?.current_streak ?? 0)}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
              data-testid="progress-stats-by-quiz-type"
            >
              <h2 className="text-lg font-semibold text-white">By quiz type</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-300" data-testid="progress-stats-quiz-type-list">
                {stats
                  ? Object.entries(stats.by_quiz_type).map(([key, value]) => (
                      <div
                        key={key}
                        data-testid={`progress-stats-quiz-type-${key}`}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3"
                      >
                        <span>{QUIZ_TYPE_LABELS[key as QuizTypeEnum]}</span>
                        <span>
                          {(value.average_score * 10).toFixed(0)}% avg · {value.count} quizzes
                        </span>
                      </div>
                    ))
                  : "No stats yet."}
              </div>
            </div>
            <div
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
              data-testid="progress-stats-by-difficulty"
            >
              <h2 className="text-lg font-semibold text-white">By difficulty</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-300" data-testid="progress-stats-difficulty-list">
                {stats
                  ? Object.entries(stats.by_difficulty).map(([key, value]) => (
                      <div
                        key={key}
                        data-testid={`progress-stats-difficulty-${key}`}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3"
                      >
                        <span className="capitalize">{key}</span>
                        <span>
                          {(value.average_score * 10).toFixed(0)}% avg · {value.count} quizzes
                        </span>
                      </div>
                    ))
                  : "No stats yet."}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="space-y-4" data-testid="progress-history-section">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white">Quiz history</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-slate-300" data-testid="progress-history-table">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Mode</th>
                    <th className="px-3 py-2 text-left">Difficulty</th>
                    <th className="px-3 py-2 text-left">Score</th>
                    <th className="px-3 py-2 text-left">Time</th>
                  </tr>
                </thead>
                <tbody data-testid="progress-history-body">
                  {sessions?.data?.length ? (
                    sessions.data.map((session) => (
                      <tr
                        key={session.id}
                        className="border-t border-white/5"
                        data-testid={`progress-history-row-${session.id}`}
                      >
                        <td className="px-3 py-3">{formatDate(session.completed_at || session.started_at)}</td>
                        <td className="px-3 py-3">{QUIZ_TYPE_LABELS[session.quiz_type]}</td>
                        <td className="px-3 py-3 capitalize">{session.difficulty}</td>
                        <td className="px-3 py-3">{session.score ?? 0}/10</td>
                        <td className="px-3 py-3">{session.time_taken_seconds ?? 0}s</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-slate-400"
                        data-testid="progress-history-empty"
                      >
                        {isLoading ? "Loading sessions..." : "No sessions yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className="flex items-center justify-between text-sm text-slate-300"
            data-testid="progress-history-pagination"
          >
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1}
              data-testid="progress-history-prev-button"
              className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 disabled:opacity-50"
            >
              Previous
            </button>
            <span data-testid="progress-history-page-info">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages}
              data-testid="progress-history-next-button"
              className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default ProgressView;
