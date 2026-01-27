import { useCallback, useState } from "react";

type GuestBannerVariant = "default" | "compact" | "quiz-complete";

interface GuestBannerProps {
  variant?: GuestBannerVariant;
  onDismiss?: () => void;
}

const GuestBanner = ({ variant = "default", onDismiss }: GuestBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  if (isDismissed) {
    return null;
  }

  if (variant === "quiz-complete") {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-emerald-300"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Great practice session!</h3>
        <p className="mt-2 text-sm text-slate-300">
          Want to save your progress and track your improvement over time?
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            Create free account
          </a>
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            Continue as guest
          </button>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-2.5">
        <p className="text-sm text-amber-200">
          <span className="font-medium">Guest mode</span> — progress won't be saved.{" "}
          <a href="/register" className="underline hover:text-amber-100">
            Create account
          </a>
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 text-amber-300/70 transition hover:bg-amber-500/20 hover:text-amber-200"
          aria-label="Dismiss banner"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-full bg-amber-500/20 p-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-amber-300"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm text-amber-200">
            <span className="font-semibold">You're playing as a guest.</span> Your progress won't be
            saved.{" "}
            <a href="/register" className="underline hover:text-amber-100">
              Create an account
            </a>{" "}
            to track your learning and unlock achievements.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuestBanner;
