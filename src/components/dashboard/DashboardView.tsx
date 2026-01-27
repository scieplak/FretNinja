import { useEffect, useMemo, useState } from "react";

import type {
  ProfileDTO,
  QuizSessionListDTO,
  StatsOverviewDTO,
  UserAchievementsDTO,
} from "@/types";

type DashboardData = {
  profile: ProfileDTO | null;
  stats: StatsOverviewDTO | null;
  achievements: UserAchievementsDTO | null;
  sessions: QuizSessionListDTO | null;
  isGuest: boolean;
};

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

const DashboardView = () => {
  const [data, setData] = useState<DashboardData>({
    profile: null,
    stats: null,
    achievements: null,
    sessions: null,
    isGuest: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const token = typeof window === "undefined" ? null : localStorage.getItem("fn_access_token");
        if (!token) {
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

        const authHeaders = { Authorization: `Bearer ${token}` };
        const profileResponse = await fetch("/api/profile", { headers: authHeaders });
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
          fetch("/api/stats/overview", { headers: authHeaders }).then((res) => (res.ok ? res.json() : null)),
          fetch("/api/user/achievements", { headers: authHeaders }).then((res) => (res.ok ? res.json() : null)),
          fetch("/api/quiz-sessions?limit=5", { headers: authHeaders }).then((res) => (res.ok ? res.json() : null)),
        ]);

        if (!active) return;

        setData({
          profile,
          stats: stats as StatsOverviewDTO | null,
          achievements: achievements as UserAchievementsDTO | null,
          sessions: sessions as QuizSessionListDTO | null,
          isGuest: false,
        });
      } catch (error) {
        if (!active) return;
        setErrorMessage("We couldn't load your dashboard right now. Please try again.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

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
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Dashboard</p>
          <h1 className="text-2xl font-semibold text-white">Welcome back, {displayName}</h1>
          <p className="text-sm text-slate-300">Track your progress and jump into your next session.</p>
        </div>
        <div className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100">
          🔥 {data.stats?.current_streak ?? 0} day streak
        </div>
      </header>

      {data.isGuest ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-4 text-sm text-emerald-100">
          You're exploring as a guest. Create an account to save progress and unlock achievements.
          <a href="/register" className="ml-2 font-semibold text-white hover:text-emerald-200">
            Register now
          </a>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-900/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {isNewUser ? "Take your first quiz" : "Start a new quiz"}
            </h2>
            <p className="text-sm text-slate-300">
              {isNewUser ? "Choose a mode and begin building your fretboard knowledge." : "Pick a challenge and keep your streak alive."}
            </p>
          </div>
          <a
            href="/quiz"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            Start quiz
          </a>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Quick stats</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {quickStats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{isLoading ? "…" : stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Recent activity</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {isLoading ? (
              <p>Loading your latest sessions...</p>
            ) : recentSessions.length === 0 ? (
              <p>No sessions yet. Start a quiz to see results here.</p>
            ) : (
              recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3">
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
            <a href="/progress" className="inline-flex text-emerald-200 hover:text-emerald-100">
              View all activity →
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Achievement progress</h3>
          <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/40 px-4 py-4 text-sm text-slate-300">
            {nextAchievement ? (
              <>
                <p className="text-white">{nextAchievement.display_name}</p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${Math.min(nextAchievement.percentage, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {nextAchievement.current}/{nextAchievement.target} completed
                </p>
              </>
            ) : (
              <p>{data.isGuest ? "Sign in to track achievements." : "Keep practicing to unlock achievements."}</p>
            )}
            <a href="/achievements" className="mt-3 inline-flex text-emerald-200 hover:text-emerald-100">
              View all achievements →
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Problem areas</h3>
          <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-300">
            <p>Heatmap preview will highlight your toughest fret positions.</p>
            <a href="/progress" className="mt-3 inline-flex text-emerald-200 hover:text-emerald-100">
              Open full heatmap →
            </a>
          </div>
        </section>
      </div>

      {!data.isGuest ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">AI tips</h3>
          <p className="mt-2 text-sm text-slate-300">
            Personalized learning tips are available after a few sessions. Check your progress to see targeted practice
            areas.
          </p>
          <a href="/progress" className="mt-3 inline-flex text-emerald-200 hover:text-emerald-100">
            Get more tips →
          </a>
        </section>
      ) : null}
    </div>
  );
};

export default DashboardView;
