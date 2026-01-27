import { useEffect, useMemo, useState } from "react";

import type { AchievementDTO, UserAchievementsDTO } from "@/types";

interface AchievementsViewProps {
  user: { id: string; email: string } | null;
}

const AchievementsView = ({ user }: AchievementsViewProps) => {
  const isGuest = !user;

  const [allAchievements, setAllAchievements] = useState<AchievementDTO[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievementsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(!isGuest);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isGuest) {
      setErrorMessage("Sign in to view your achievements.");
      setIsLoading(false);
      return;
    }

    let active = true;
    const fetchOptions: RequestInit = { credentials: "include" };

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [allRes, userRes] = await Promise.all([
          fetch("/api/achievements", fetchOptions),
          fetch("/api/user/achievements", fetchOptions),
        ]);

        if (!active) return;

        setAllAchievements(allRes.ok ? ((await allRes.json()).data as AchievementDTO[]) : []);
        setUserAchievements(userRes.ok ? ((await userRes.json()) as UserAchievementsDTO) : null);
      } catch {
        if (!active) return;
        setErrorMessage("Unable to load achievements right now.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isGuest]);

  const cards = useMemo(() => {
    if (!allAchievements.length) return [];

    const earned = userAchievements?.earned ?? [];
    const progress = userAchievements?.progress ?? [];
    const progressMap = new Map(progress.map((item) => [item.id, item]));

    const enriched = allAchievements.map((achievement) => {
      const earnedItem = earned.find((item) => item.id === achievement.id);
      if (earnedItem) {
        return {
          id: achievement.id,
          displayName: achievement.display_name,
          description: achievement.description,
          earnedAt: earnedItem.earned_at,
          status: "earned" as const,
        };
      }

      const progressItem = progressMap.get(achievement.id);
      if (progressItem) {
        return {
          id: achievement.id,
          displayName: achievement.display_name,
          description: achievement.description,
          progress: progressItem,
          status: "progress" as const,
        };
      }

      return {
        id: achievement.id,
        displayName: achievement.display_name,
        description: achievement.description,
        status: "locked" as const,
      };
    });

    return enriched.sort((a, b) => {
      const statusOrder = { earned: 0, progress: 1, locked: 2 } as const;
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      if (a.status === "earned" && b.status === "earned") {
        return new Date(b.earnedAt ?? 0).getTime() - new Date(a.earnedAt ?? 0).getTime();
      }
      if (a.status === "progress" && b.status === "progress") {
        return (b.progress?.percentage ?? 0) - (a.progress?.percentage ?? 0);
      }
      return a.displayName.localeCompare(b.displayName);
    });
  }, [allAchievements, userAchievements]);

  const isRecentlyEarned = (earnedAt?: string | null) => {
    if (!earnedAt) return false;
    const earnedTime = new Date(earnedAt).getTime();
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return now - earnedTime <= sevenDays;
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Achievements</p>
        <h1 className="text-2xl font-semibold text-white">Your milestones</h1>
        <p className="text-sm text-slate-300">Earn badges by hitting practice goals and streaks.</p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            Loading achievements...
          </div>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              className={`rounded-2xl border p-6 ${
                card.status === "earned"
                  ? "border-emerald-400/40 bg-emerald-400/10 shadow-lg shadow-emerald-500/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <h2 className="text-lg font-semibold text-white">{card.displayName}</h2>
              <p className="mt-2 text-sm text-slate-300">{card.description}</p>

              {card.status === "earned" ? (
                <div className="mt-4 flex items-center justify-between text-xs text-emerald-200">
                  <span>Earned on {new Date(card.earnedAt!).toDateString()}</span>
                  <div className="flex items-center gap-2">
                    {isRecentlyEarned(card.earnedAt) ? (
                      <span className="rounded-full border border-emerald-400/70 bg-emerald-400/30 px-2 py-1 text-[0.6rem] uppercase tracking-[0.2em] animate-pulse">
                        New
                      </span>
                    ) : null}
                    <span className="rounded-full border border-emerald-400/50 bg-emerald-400/20 px-2 py-1 text-[0.6rem] uppercase tracking-[0.2em]">
                      Earned
                    </span>
                  </div>
                </div>
              ) : null}

              {card.status === "progress" ? (
                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${card.progress?.percentage ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {card.progress?.current}/{card.progress?.target} · {card.progress?.percentage ?? 0}%
                  </p>
                </div>
              ) : null}

              {card.status === "locked" ? (
                <p className="mt-4 text-xs text-slate-500">Locked · Keep practicing to unlock</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AchievementsView;
