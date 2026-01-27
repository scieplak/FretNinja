import { useEffect, useMemo, useState } from "react";

import type { ProfileDTO, StatsOverviewDTO, UpdateProfileCommand } from "@/types";

interface ProfileViewProps {
  user: { id: string; email: string } | null;
}

const ProfileView = ({ user }: ProfileViewProps) => {
  const isGuest = !user;

  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [stats, setStats] = useState<StatsOverviewDTO | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!isGuest);
  const [displayName, setDisplayName] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isGuest) {
      setErrorMessage("Sign in to view your profile.");
      setIsLoading(false);
      return;
    }

    let active = true;
    const fetchOptions: RequestInit = { credentials: "include" };

    const load = async () => {
      setIsLoading(true);
      try {
        const [profileRes, statsRes] = await Promise.all([
          fetch("/api/profile", fetchOptions),
          fetch("/api/stats/overview", fetchOptions),
        ]);

        if (!active) return;

        const profileData = profileRes.ok ? ((await profileRes.json()) as ProfileDTO) : null;
        setProfile(profileData);
        setDisplayName(profileData?.display_name ?? "");
        setStats(statsRes.ok ? ((await statsRes.json()) as StatsOverviewDTO) : null);
      } catch {
        if (!active) return;
        setErrorMessage("Unable to load profile right now.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isGuest]);

  useEffect(() => {
    if (!profile || isGuest) return;
    if ((profile.display_name ?? "") === displayName) return;

    setSaveError(null);
    const timeout = window.setTimeout(async () => {
      setIsSaving(true);
      const payload: UpdateProfileCommand = {
        display_name: displayName.trim() === "" ? null : displayName.trim(),
      };
      try {
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error("save");
        }
        const updated = (await response.json()) as ProfileDTO;
        setProfile(updated);
        setSaveMessage("Saved");
        setTimeout(() => setSaveMessage(null), 1500);
      } catch {
        setSaveError("Unable to save display name.");
      } finally {
        setIsSaving(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [displayName, profile, isGuest]);

  const displayNameLabel = useMemo(() => {
    if (profile?.display_name) return profile.display_name;
    if (profile?.email) return profile.email.split("@")[0];
    return "Guitarist";
  }, [profile]);

  const initials = useMemo(() => displayNameLabel.slice(0, 2).toUpperCase(), [displayNameLabel]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Profile</p>
        <h1 className="text-2xl font-semibold text-white">Your account</h1>
        <p className="text-sm text-slate-300">Manage your profile details and review key stats.</p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <section className="flex flex-wrap items-center gap-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-lg font-semibold text-emerald-100">
          {initials}
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-white">{displayNameLabel}</p>
          <p className="text-sm text-slate-300">{profile?.email ?? "—"}</p>
          <p className="text-xs text-slate-400">
            Member since {profile?.created_at ? new Date(profile.created_at).toDateString() : "—"}
          </p>
          <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
            Display name
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-slate-200"
            />
          </label>
          {isSaving ? <p className="text-xs text-slate-400">Saving...</p> : null}
          {saveMessage ? <p className="text-xs text-emerald-200">{saveMessage}</p> : null}
          {saveError ? <p className="text-xs text-rose-300">{saveError}</p> : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current streak</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {isLoading ? "—" : stats?.current_streak ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Longest streak</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {isLoading ? "—" : stats?.longest_streak ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total quizzes</p>
          <p className="mt-2 text-2xl font-semibold text-white">{isLoading ? "—" : stats?.total_quizzes ?? 0}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Quick links</h2>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
          <a href="/progress" className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 hover:text-emerald-200">
            View progress
          </a>
          <a
            href="/achievements"
            className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 hover:text-emerald-200"
          >
            View achievements
          </a>
          <a href="/settings" className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 hover:text-emerald-200">
            Settings
          </a>
        </div>
      </section>
    </div>
  );
};

export default ProfileView;
