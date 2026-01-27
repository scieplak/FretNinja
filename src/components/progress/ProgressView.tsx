import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  HeatmapResponseDTO,
  QuizSessionListDTO,
  QuizTypeEnum,
  StatsOverviewDTO,
} from "@/types";

interface ProgressViewProps {
  user: { id: string; email: string } | null;
}

type TabKey = "heatmap" | "stats" | "history";

const QUIZ_TYPE_LABELS: Record<QuizTypeEnum, string> = {
  find_note: "Find Note",
  name_note: "Name Note",
  mark_chord: "Mark Chord",
  recognize_interval: "Recognize Interval",
};

const DATE_RANGES = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

const formatHours = (seconds?: number | null) => {
  if (!seconds) return "0.0";
  return (seconds / 3600).toFixed(1);
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const ProgressView = ({ user }: ProgressViewProps) => {
  const isGuest = !user;

  const [tab, setTab] = useState<TabKey>("heatmap");
  const [quizType, setQuizType] = useState<QuizTypeEnum | "all">("all");
  const [dateRange, setDateRange] = useState("7");
  const [stats, setStats] = useState<StatsOverviewDTO | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResponseDTO | null>(null);
  const [sessions, setSessions] = useState<QuizSessionListDTO | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(!isGuest);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const buildHeatmapQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (quizType !== "all") {
      params.set("quiz_type", quizType);
    }
    if (dateRange !== "all") {
      const days = Number(dateRange);
      const from = new Date();
      from.setDate(from.getDate() - days);
      params.set("from_date", from.toISOString());
    }
    return params.toString();
  }, [dateRange, quizType]);

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
        const [statsRes, heatmapRes, sessionsRes] = await Promise.all([
          fetch("/api/stats/overview", fetchOptions),
          fetch(`/api/stats/heatmap?${buildHeatmapQuery()}`, fetchOptions),
          fetch(`/api/quiz-sessions?page=${page}&limit=20`, fetchOptions),
        ]);

        if (!active) return;

        setStats(statsRes.ok ? ((await statsRes.json()) as StatsOverviewDTO) : null);
        setHeatmap(heatmapRes.ok ? ((await heatmapRes.json()) as HeatmapResponseDTO) : null);
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
  }, [buildHeatmapQuery, page, isGuest]);

  const totalPages = sessions?.pagination.total_pages ?? 1;

  const heatmapSummary = useMemo(() => {
    if (!heatmap) return "No heatmap data yet.";
    return `${heatmap.data.length} positions tracked · ${heatmap.total_errors} total errors`;
  }, [heatmap]);

  const heatmapGrid = useMemo(() => {
    const maxErrors = heatmap?.max_error_count ?? 0;
    const errorMap = new Map<string, number>();
    heatmap?.data.forEach((item) => {
      errorMap.set(`${item.string_number}-${item.fret_position}`, item.error_count);
    });

    const cells: { key: string; label: string; errorCount: number; intensity: number }[] = [];
    const frets = 13;
    const strings = 6;
    for (let string = strings; string >= 1; string -= 1) {
      for (let fret = 0; fret < frets; fret += 1) {
        const errorCount = errorMap.get(`${string}-${fret}`) ?? 0;
        const intensity = maxErrors > 0 ? errorCount / maxErrors : 0;
        cells.push({
          key: `${string}-${fret}`,
          label: `String ${string}, fret ${fret} (${errorCount} errors)`,
          errorCount,
          intensity,
        });
      }
    }
    return cells;
  }, [heatmap]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Progress</p>
        <h1 className="text-2xl font-semibold text-white">Track your learning progress</h1>
        <p className="text-sm text-slate-300">Review heatmaps, stats, and session history in one place.</p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(["heatmap", "stats", "history"] as TabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
              tab === key
                ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                : "border-white/10 bg-white/5 text-slate-300"
            }`}
            aria-selected={tab === key}
            role="tab"
          >
            {key}
          </button>
        ))}
      </div>

      {tab === "heatmap" ? (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <select
              value={quizType}
              onChange={(event) => setQuizType(event.target.value as QuizTypeEnum | "all")}
              className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-200"
            >
              <option value="all">All quiz types</option>
              {Object.entries(QUIZ_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-200"
            >
              {DATE_RANGES.map((range) => (
                <option key={range.id} value={range.id}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-slate-300">{isLoading ? "Loading heatmap..." : heatmapSummary}</p>
            <div className="mt-4 grid gap-2">
              <div className="grid grid-cols-[40px_repeat(13,minmax(0,1fr))] gap-2 text-[0.65rem] text-slate-400">
                <div></div>
                {Array.from({ length: 13 }).map((_, index) => (
                  <div key={index} className="text-center">{index}</div>
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, stringIndex) => {
                const stringNumber = 6 - stringIndex;
                const stringNoteMap: Record<number, string> = {
                  6: "E",
                  5: "A",
                  4: "D",
                  3: "G",
                  2: "B",
                  1: "E",
                };
                const stringLabel = stringNoteMap[stringNumber] ?? "";
                return (
                  <div key={stringNumber} className="grid grid-cols-[40px_repeat(13,minmax(0,1fr))] gap-2">
                    <div className="flex items-center justify-center text-[0.65rem] text-slate-300">
                      S{stringNumber} {stringLabel}
                    </div>
                    {heatmapGrid
                      .filter((cell) => cell.key.startsWith(`${stringNumber}-`))
                      .map((cell) => (
                        <div
                          key={cell.key}
                          className="group relative h-10 rounded-lg border border-white/10"
                          style={{
                            backgroundColor: `hsl(${120 - cell.intensity * 120} 65% 35% / ${
                              0.15 + cell.intensity * 0.7
                            })`,
                          }}
                        >
                          <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md border border-white/10 bg-slate-950 px-2 py-1 text-[0.65rem] text-slate-200 group-hover:block">
                            {cell.label}
                          </span>
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
              <span>0</span>
              <div className="h-2 w-28 rounded-full bg-gradient-to-r from-emerald-400/30 via-yellow-400/30 to-rose-500/40"></div>
              <span>{heatmap?.max_error_count ?? 0} errors</span>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "stats" ? (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total quizzes</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {isLoading ? "—" : stats?.total_quizzes ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Practice time</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {isLoading ? "—" : `${formatHours(stats?.total_time_seconds)} hrs`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current streak</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {isLoading ? "—" : stats?.current_streak ?? 0}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">By quiz type</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                {stats
                  ? Object.entries(stats.by_quiz_type).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3">
                        <span>{QUIZ_TYPE_LABELS[key as QuizTypeEnum]}</span>
                        <span>{value.average_score}% avg · {value.count} quizzes</span>
                      </div>
                    ))
                  : "No stats yet."}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">By difficulty</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                {stats
                  ? Object.entries(stats.by_difficulty).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3">
                        <span className="capitalize">{key}</span>
                        <span>{value.average_score}% avg · {value.count} quizzes</span>
                      </div>
                    ))
                  : "No stats yet."}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white">Quiz history</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-slate-300">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Mode</th>
                    <th className="px-3 py-2 text-left">Difficulty</th>
                    <th className="px-3 py-2 text-left">Score</th>
                    <th className="px-3 py-2 text-left">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions?.data?.length ? (
                    sessions.data.map((session) => (
                      <tr key={session.id} className="border-t border-white/5">
                        <td className="px-3 py-3">{formatDate(session.completed_at || session.started_at)}</td>
                        <td className="px-3 py-3">{QUIZ_TYPE_LABELS[session.quiz_type]}</td>
                        <td className="px-3 py-3 capitalize">{session.difficulty}</td>
                        <td className="px-3 py-3">{session.score ?? 0}/10</td>
                        <td className="px-3 py-3">{session.time_taken_seconds ?? 0}s</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                        {isLoading ? "Loading sessions..." : "No sessions yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-300">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1}
              className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages}
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
