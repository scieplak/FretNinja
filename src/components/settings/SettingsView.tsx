import { useCallback, useEffect, useState } from "react";

import type { ProfileDTO, UpdateProfileCommand } from "@/types";

interface SettingsViewProps {
  user: { id: string; email: string } | null;
}

const SettingsView = ({ user }: SettingsViewProps) => {
  const isGuest = !user;

  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [fretRange, setFretRange] = useState<12 | 24>(12);
  const [showNoteNames, setShowNoteNames] = useState(true);
  const [masterVolume, setMasterVolume] = useState(80);
  const [noteSounds, setNoteSounds] = useState(true);
  const [feedbackSounds, setFeedbackSounds] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("fn_settings");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        fretRange?: 12 | 24;
        showNoteNames?: boolean;
        masterVolume?: number;
        noteSounds?: boolean;
        feedbackSounds?: boolean;
      };
      if (parsed.fretRange) setFretRange(parsed.fretRange);
      if (typeof parsed.showNoteNames === "boolean") setShowNoteNames(parsed.showNoteNames);
      if (typeof parsed.masterVolume === "number") setMasterVolume(parsed.masterVolume);
      if (typeof parsed.noteSounds === "boolean") setNoteSounds(parsed.noteSounds);
      if (typeof parsed.feedbackSounds === "boolean") setFeedbackSounds(parsed.feedbackSounds);
    } catch {
      // ignore invalid local settings
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "fn_settings",
      JSON.stringify({
        fretRange,
        showNoteNames,
        masterVolume,
        noteSounds,
        feedbackSounds,
      })
    );
  }, [feedbackSounds, fretRange, masterVolume, noteSounds, showNoteNames]);

  useEffect(() => {
    if (isGuest) return;

    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/profile", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("profile");
        }
        const data = (await response.json()) as ProfileDTO;
        if (!active) return;
        setProfile(data);
        setDisplayName(data.display_name ?? "");
        if (data.fretboard_range === 24) setFretRange(24);
        if (typeof data.show_note_names === "boolean") setShowNoteNames(data.show_note_names);
      } catch {
        // Profile load failed, component will show guest state
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isGuest]);

  const saveProfile = useCallback(
    async (updates: UpdateProfileCommand) => {
      if (isGuest) return;
      try {
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          throw new Error("save");
        }
        const data = (await response.json()) as ProfileDTO;
        setProfile(data);
        setSaveMessage("Saved");
        setTimeout(() => setSaveMessage(null), 1500);
      } catch {
        setErrorMessage("Unable to save changes.");
        setTimeout(() => setErrorMessage(null), 2000);
      }
    },
    [isGuest]
  );

  useEffect(() => {
    if (isGuest) return;
    const timeout = window.setTimeout(() => {
      saveProfile({
        display_name: displayName || null,
        fretboard_range: fretRange,
        show_note_names: showNoteNames,
      });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [displayName, fretRange, isGuest, saveProfile, showNoteNames]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Settings</p>
        <h1 className="text-2xl font-semibold text-white">Customize your experience</h1>
        <p className="text-sm text-slate-300">Adjust fretboard, audio, and account preferences.</p>
      </header>

      {saveMessage ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-3 text-sm text-emerald-100">
          {saveMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-6 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Fretboard</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setFretRange((prev) => (prev === 12 ? 24 : 12))}
            className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm text-slate-300"
          >
            Fretboard range: {fretRange} frets
          </button>
          <button
            type="button"
            onClick={() => setShowNoteNames((prev) => !prev)}
            className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm text-slate-300"
          >
            {showNoteNames ? "Hide note names" : "Show note names"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Audio</h2>
        <div className="mt-4 space-y-4 text-sm text-slate-300">
          <label className="flex items-center justify-between gap-4">
            <span>Master volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={masterVolume}
              onChange={(event) => setMasterVolume(Number(event.target.value))}
              className="w-40"
            />
          </label>
          <button
            type="button"
            onClick={() => setNoteSounds((prev) => !prev)}
            className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm"
          >
            Note sounds: {noteSounds ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={() => setFeedbackSounds((prev) => !prev)}
            className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm"
          >
            Feedback sounds: {feedbackSounds ? "On" : "Off"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Account</h2>
        {isGuest ? (
          <p className="mt-3 text-sm text-slate-300">Sign in to edit account settings.</p>
        ) : (
          <div className="mt-4 space-y-4 text-sm text-slate-300">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</span>
              <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                {profile?.email ?? "—"}
              </div>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200"
              />
            </label>
            <a href="/reset-password" className="inline-flex text-emerald-200 hover:text-emerald-100">
              Change password
            </a>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Tutorials</h2>
        <button
          type="button"
          className="mt-4 rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300"
          onClick={() => localStorage.removeItem("fn_tutorials")}
        >
          Reset tutorials
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">About</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-300">
          <p>Version 0.1.0 · Astro 5 · React 19</p>
          <p className="text-xs text-slate-400">Built for fretboard learning with dark-mode performance focus.</p>
          <a href="https://github.com/scieplak/FretNinja/issues" className="text-emerald-200 hover:text-emerald-100">
            Support & feedback
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
        <h2 className="text-lg font-semibold text-white">Delete account</h2>
        <p className="mt-2 text-sm text-slate-200">
          This is a placeholder. Account deletion will require password confirmation.
        </p>
        <button
          type="button"
          disabled={isGuest}
          className="mt-4 rounded-lg border border-rose-500/50 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete account
        </button>
        {isGuest ? <p className="mt-2 text-xs text-slate-300">Sign in to manage your account.</p> : null}
      </section>
    </div>
  );
};

export default SettingsView;
