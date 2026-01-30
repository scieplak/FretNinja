import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ProfileDTO,
  QuizSessionListDTO,
  StatsOverviewDTO,
  UserAchievementsDTO,
  NoteMasteryResponseDTO,
  NoteEnum,
  PersonalizedTipsResponseDTO,
} from "@/types";

interface DashboardViewProps {
  user: { id: string; email: string } | null;
  initialProfile?: ProfileDTO | null;
  initialStats?: StatsOverviewDTO | null;
  initialAchievements?: UserAchievementsDTO | null;
  initialSessions?: QuizSessionListDTO | null;
  initialNoteMastery?: NoteMasteryResponseDTO | null;
}

const NOTE_ORDER: NoteEnum[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const getAccuracyColor = (accuracy: number) => {
  if (accuracy >= 80) return "bg-emerald-500";
  if (accuracy >= 60) return "bg-emerald-400";
  if (accuracy >= 40) return "bg-yellow-400";
  if (accuracy >= 20) return "bg-orange-400";
  return "bg-rose-500";
};

interface DashboardData {
  profile: ProfileDTO | null;
  stats: StatsOverviewDTO | null;
  achievements: UserAchievementsDTO | null;
  sessions: QuizSessionListDTO | null;
  isGuest: boolean;
}

const formatHours = (seconds?: number | null) => {
  if (!seconds) {
    return "0.0";
  }
  return (seconds / 3600).toFixed(1);
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const DashboardView = ({
  user,
  initialProfile,
  initialStats,
  initialAchievements,
  initialSessions,
  initialNoteMastery,
}: DashboardViewProps) => {
  const isGuest = !user;

  // Use server-provided data as initial state (no loading flash)
  const [data, setData] = useState<DashboardData>({
    profile: initialProfile ?? null,
    stats: initialStats ?? null,
    achievements: initialAchievements ?? null,
    sessions: initialSessions ?? null,
    isGuest,
  });
  // Only show loading if we're logged in but have no initial data
  const [isLoading, setIsLoading] = useState(!isGuest && !initialProfile);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI Tips state
  const [aiTips, setAiTips] = useState<PersonalizedTipsResponseDTO | null>(null);
  const [aiTipsLoading, setAiTipsLoading] = useState(false);
  const [aiTipsError, setAiTipsError] = useState<string | null>(null);

  useEffect(() => {
    // If guest, no data to load
    if (isGuest) {
      return;
    }

    let active = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Use credentials: "include" to send cookies for auth
        const fetchOptions: RequestInit = { credentials: "include" };

        const profileResponse = await fetch("/api/profile", fetchOptions);
        if (profileResponse.status === 401 || profileResponse.status === 403) {
          if (!active) return;
          setData({
            profile: null,
            stats: null,
            achievements: null,
            sessions: null,
            isGuest: true,
          });
          setIsLoading(false);
          return;
        }

        if (!profileResponse.ok) {
          throw new Error("Unable to load profile");
        }

        const profile = (await profileResponse.json()) as ProfileDTO;
        const [stats, achievements, sessions] = await Promise.all([
          fetch("/api/stats/overview", fetchOptions).then((res) => (res.ok ? res.json() : null)),
          fetch("/api/user/achievements", fetchOptions).then((res) => (res.ok ? res.json() : null)),
          fetch("/api/quiz-sessions?limit=5", fetchOptions).then((res) => (res.ok ? res.json() : null)),
        ]);

        if (!active) return;

        setData({
          profile,
          stats: stats as StatsOverviewDTO | null,
          achievements: achievements as UserAchievementsDTO | null,
          sessions: sessions as QuizSessionListDTO | null,
          isGuest: false,
        });
      } catch {
        if (!active) return;
        setErrorMessage("We couldn't load your dashboard right now. Please try again.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    // Only fetch on mount if we don't have initial data
    if (!initialProfile) {
      load();
    }

    // Refetch when page becomes visible (user returns from quiz)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isGuest) {
        load();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isGuest, initialProfile]);

  // Fetch AI tips on demand
  const fetchAiTips = useCallback(async () => {
    if (isGuest) return;

    setAiTipsLoading(true);
    setAiTipsError(null);

    try {
      const response = await fetch("/api/ai/personalized-tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ limit: 3 }),
      });

      if (response.status === 401) {
        setAiTipsError("Sign in to access AI tips.");
        return;
      }

      if (response.status === 404) {
        // INSUFFICIENT_DATA - not enough quiz data
        setAiTipsError("Complete more quizzes to unlock personalized tips.");
        return;
      }

      if (!response.ok) {
        setAiTipsError("Tips unavailable right now. Try again later.");
        return;
      }

      const tips = (await response.json()) as PersonalizedTipsResponseDTO;
      setAiTips(tips);
    } catch {
      setAiTipsError("Network error. Please check your connection.");
    } finally {
      setAiTipsLoading(false);
    }
  }, [isGuest]);

  const displayName = useMemo(() => {
    if (data.profile?.display_name) {
      return data.profile.display_name;
    }
    if (data.profile?.email) {
      return data.profile.email.split("@")[0];
    }
    return "Guitarist";
  }, [data.profile]);

  const quickStats = useMemo(() => {
    if (!data.stats) {
      return [
        { label: "Quizzes completed", value: "—" },
        { label: "Average score", value: "—" },
        { label: "Practice time", value: "—" },
      ];
    }

    const totalScore =
      data.stats.by_quiz_type.find_note.average_score +
      data.stats.by_quiz_type.name_note.average_score +
      data.stats.by_quiz_type.mark_chord.average_score +
      data.stats.by_quiz_type.recognize_interval.average_score;
    const averageScore = totalScore / 4;

    return [
      { label: "Quizzes completed", value: `${data.stats.total_quizzes}` },
      { label: "Average score", value: `${Math.round(averageScore)}%` },
      { label: "Practice time", value: `${formatHours(data.stats.total_time_seconds)} hrs` },
    ];
  }, [data.stats]);

  const recentSessions = useMemo(() => {
    return data.sessions?.data?.slice(0, 5) ?? [];
  }, [data.sessions]);

  const nextAchievement = useMemo(() => {
    if (!data.achievements?.progress?.length) {
      return null;
    }
    return [...data.achievements.progress].sort((a, b) => b.percentage - a.percentage)[0];
  }, [data.achievements]);

  const isNewUser = (data.stats?.total_quizzes ?? 0) === 0 && !data.isGuest;

  return (
    <div className="space-y-8" data-testid="dashboard-view">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Dashboard</p>
          <h1 className="text-2xl font-semibold text-white" data-testid="dashboard-welcome">
            Welcome back, {displayName}
          </h1>
          <p className="text-sm text-slate-300">Track your progress and jump into your next session.</p>
        </div>
        <div
          data-testid="dashboard-streak"
          className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100"
        >
          🔥 {data.stats?.current_streak ?? 0} day streak
        </div>
      </header>

      {data.isGuest ? (
        <div
          className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-4 text-sm text-emerald-100"
          data-testid="dashboard-guest-prompt"
        >
          You're exploring as a guest. Create an account to save progress and unlock achievements.
          <a
            href="/register"
            data-testid="dashboard-register-link"
            className="ml-2 font-semibold text-white hover:text-emerald-200"
          >
            Register now
          </a>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-6 py-4 text-sm text-rose-200"
          data-testid="dashboard-error"
        >
          {errorMessage}
        </div>
      ) : null}

      <section
        className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-900/50"
        data-testid="dashboard-start-quiz-section"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {isNewUser ? "Take your first quiz" : "Start a new quiz"}
            </h2>
            <p className="text-sm text-slate-300">
              {isNewUser
                ? "Choose a mode and begin building your fretboard knowledge."
                : "Pick a challenge and keep your streak alive."}
            </p>
          </div>
          <a
            href="/quiz"
            data-testid="dashboard-start-quiz-button"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            Start quiz
          </a>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section data-testid="dashboard-quick-stats" className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Quick stats</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {quickStats.map((stat, index) => (
              <div
                key={stat.label}
                data-testid={`dashboard-stat-${index}`}
                className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{isLoading ? "…" : stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section data-testid="dashboard-recent-activity" className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Recent activity</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {isLoading ? (
              <p>Loading your latest sessions...</p>
            ) : recentSessions.length === 0 ? (
              <p data-testid="dashboard-empty-sessions">No sessions yet. Start a quiz to see results here.</p>
            ) : (
              recentSessions.map((session) => (
                <div
                  key={session.id}
                  data-testid="dashboard-session-item"
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3"
                >
                  <div>
                    <p className="text-white">
                      {session.quiz_type.replace("_", " ")} · {session.difficulty}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(session.completed_at || session.started_at)}</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                    {session.score ?? 0}/10
                  </span>
                </div>
              ))
            )}
            <a
              href="/progress"
              data-testid="dashboard-view-activity"
              className="inline-flex text-emerald-200 hover:text-emerald-100"
            >
              View all activity →
            </a>
          </div>
        </section>

        <section
          className="rounded-2xl border border-white/10 bg-white/5 p-6"
          data-testid="dashboard-achievement-progress"
        >
          <h3 className="text-lg font-semibold text-white">Achievement progress</h3>
          <div
            className="mt-4 rounded-lg border border-white/10 bg-slate-950/40 px-4 py-4 text-sm text-slate-300"
            data-testid="dashboard-next-achievement"
          >
            {nextAchievement ? (
              <>
                <p className="text-white" data-testid="dashboard-next-achievement-name">
                  {nextAchievement.display_name}
                </p>
                <div
                  className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800"
                  role="progressbar"
                  aria-valuenow={nextAchievement.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  data-testid="dashboard-next-achievement-progress"
                >
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${Math.min(nextAchievement.percentage, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400" data-testid="dashboard-next-achievement-text">
                  {nextAchievement.current}/{nextAchievement.target} completed
                </p>
              </>
            ) : (
              <p data-testid="dashboard-no-achievement">
                {data.isGuest ? "Sign in to track achievements." : "Keep practicing to unlock achievements."}
              </p>
            )}
            <a
              href="/achievements"
              data-testid="dashboard-view-achievements"
              className="mt-3 inline-flex text-emerald-200 hover:text-emerald-100"
            >
              View all achievements →
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6" data-testid="dashboard-note-mastery">
          <h3 className="text-lg font-semibold text-white">Note mastery</h3>
          <div className="mt-4">
            {initialNoteMastery && initialNoteMastery.total_attempts > 0 ? (
              <>
                <div className="grid grid-cols-6 gap-2">
                  {NOTE_ORDER.map((note) => {
                    const item = initialNoteMastery.data.find((d) => d.note === note);
                    const accuracy = item?.accuracy ?? 0;
                    const hasData = (item?.total_attempts ?? 0) > 0;
                    return (
                      <div
                        key={note}
                        className="flex flex-col items-center rounded-lg border border-white/10 bg-slate-950/40 p-2"
                        title={hasData ? `${accuracy}% accuracy` : "No data"}
                      >
                        <span className="text-xs font-semibold text-white">{note}</span>
                        {hasData ? (
                          <div className={`mt-1 h-1.5 w-full rounded-full ${getAccuracyColor(accuracy)}`} />
                        ) : (
                          <div className="mt-1 h-1.5 w-full rounded-full bg-slate-700" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  {initialNoteMastery.overall_accuracy}% overall · {initialNoteMastery.total_attempts} attempts
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-300">
                {data.isGuest ? "Sign in to track note mastery." : "Complete quizzes to see which notes need practice."}
              </p>
            )}
            <a
              href="/progress"
              data-testid="dashboard-open-mastery"
              className="mt-3 inline-flex text-sm text-emerald-200 hover:text-emerald-100"
            >
              View full breakdown →
            </a>
          </div>
        </section>
      </div>

      {!data.isGuest ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6" data-testid="dashboard-ai-tips">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">AI tips</h3>
            {!aiTips && !aiTipsLoading && (
              <button
                type="button"
                onClick={fetchAiTips}
                disabled={aiTipsLoading}
                className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-50"
                data-testid="dashboard-get-ai-tips"
              >
                {aiTipsLoading ? "Loading..." : "Get AI tips"}
              </button>
            )}
          </div>

          {aiTipsError && (
            <p className="mt-3 text-sm text-amber-300" data-testid="dashboard-ai-tips-error">
              {aiTipsError}
            </p>
          )}

          {aiTips ? (
            <div className="mt-4 space-y-4" data-testid="dashboard-ai-tips-content">
              {aiTips.tips.map((tip, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4"
                  data-testid={`dashboard-ai-tip-${index}`}
                >
                  <p className="font-semibold text-emerald-200">{tip.focus_area}</p>
                  <p className="mt-1 text-sm text-slate-300">{tip.observation}</p>
                  <p className="mt-2 text-sm text-white">{tip.suggestion}</p>
                  {tip.practice_positions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tip.practice_positions.slice(0, 4).map((pos, posIdx) => (
                        <span
                          key={posIdx}
                          className="rounded-full border border-white/20 bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                        >
                          {pos.note} (fret {pos.fret}, string {pos.string})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {aiTips.overall_recommendation && (
                <div className="rounded-lg border border-purple-400/20 bg-purple-400/5 p-4">
                  <p className="text-sm font-semibold text-purple-200">Overall recommendation</p>
                  <p className="mt-1 text-sm text-slate-300">{aiTips.overall_recommendation}</p>
                </div>
              )}

              <button
                type="button"
                onClick={fetchAiTips}
                disabled={aiTipsLoading}
                className="mt-2 text-sm text-emerald-200 hover:text-emerald-100 disabled:opacity-50"
              >
                {aiTipsLoading ? "Refreshing..." : "Refresh tips"}
              </button>
            </div>
          ) : !aiTipsError && !aiTipsLoading ? (
            <p className="mt-2 text-sm text-slate-300">
              Click the button to get personalized learning tips based on your quiz performance.
            </p>
          ) : null}

          {aiTipsLoading && !aiTips && (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Analyzing your quiz performance...
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
};

export default DashboardView;
