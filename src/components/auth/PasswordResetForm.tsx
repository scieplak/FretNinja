import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import type { ApiErrorDTO, PasswordResetCommand, PasswordUpdateCommand } from "@/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getResetTokenFromUrl = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return (
    searchParams.get("access_token") ||
    searchParams.get("token") ||
    hashParams.get("access_token") ||
    hashParams.get("token")
  );
};

const PasswordResetForm = () => {
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [step, setStep] = useState<"request" | "update">("request");
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEmailValid = useMemo(() => EMAIL_REGEX.test(email.trim()), [email]);
  const isPasswordValid = useMemo(() => password.length >= 8, [password]);

  useEffect(() => {
    const foundToken = getResetTokenFromUrl();
    if (foundToken) {
      setToken(foundToken);
      setStep("update");
    }
  }, []);

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    setErrorMessage(null);
  }, []);

  const handlePasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    setErrorMessage(null);
  }, []);

  const handleRequestReset = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTouched((prev) => ({ ...prev, email: true }));
      setErrorMessage(null);
      setMessage(null);

      if (!isEmailValid || isSubmitting) {
        return;
      }

      setIsSubmitting(true);

      try {
        const payload: PasswordResetCommand = { email: email.trim() };
        const response = await fetch("/api/auth/password-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok && response.status === 400) {
          setErrorMessage("Please enter a valid email address.");
          return;
        }

        if (!response.ok) {
          const error = (await response.json().catch(() => null)) as ApiErrorDTO | null;
          if (error?.code === "RATE_LIMITED") {
            setErrorMessage("Too many requests. Please wait a moment and try again.");
            return;
          }
        }

        setMessage(
          "If that email exists, you'll receive a reset link shortly. Check your inbox and spam folder."
        );
      } catch (error) {
        setErrorMessage("Network error. Please check your connection and try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, isEmailValid, isSubmitting]
  );

  const handleUpdatePassword = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTouched((prev) => ({ ...prev, password: true }));
      setErrorMessage(null);
      setMessage(null);

      if (!isPasswordValid || isSubmitting) {
        return;
      }

      if (!token) {
        setErrorMessage("Reset token is missing or expired. Please request a new link.");
        setStep("request");
        return;
      }

      setIsSubmitting(true);

      try {
        const payload: PasswordUpdateCommand = { password };
        const response = await fetch("/api/auth/password-update", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = (await response.json().catch(() => null)) as ApiErrorDTO | null;
          if (error?.code === "INVALID_TOKEN") {
            setErrorMessage("Reset link is invalid or expired. Please request a new one.");
            setStep("request");
            return;
          }
          setErrorMessage("Unable to update password. Please try again.");
          return;
        }

        setMessage("Password updated! You can now log in with your new password.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } catch (error) {
        setErrorMessage("Network error. Please check your connection and try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [isPasswordValid, isSubmitting, password, token]
  );

  return step === "update" ? (
    <form className="space-y-6" onSubmit={handleUpdatePassword} noValidate>
      <div className="space-y-2">
        <label htmlFor={passwordId} className="text-sm font-medium text-slate-200">
          New password
        </label>
        <div className="relative">
          <input
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={handlePasswordChange}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 pr-20 text-sm text-white shadow-sm outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/30"
            aria-invalid={touched.password && !isPasswordValid}
            aria-describedby={!isPasswordValid && touched.password ? errorId : undefined}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-200 hover:text-emerald-100"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {touched.password && !isPasswordValid ? (
          <p id={errorId} className="text-xs text-rose-300">
            Password must be at least 8 characters.
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <div role="alert" aria-live="polite" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      {message ? (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!isPasswordValid || isSubmitting}
        className="flex w-full items-center justify-center rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {isSubmitting ? "Updating..." : "Update password"}
      </button>

      <button
        type="button"
        className="w-full text-center text-sm text-slate-400 hover:text-emerald-200"
        onClick={() => setStep("request")}
      >
        Need a new reset link?
      </button>
    </form>
  ) : (
    <form className="space-y-6" onSubmit={handleRequestReset} noValidate>
      <div className="space-y-2">
        <label htmlFor={emailId} className="text-sm font-medium text-slate-200">
          Email address
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={handleEmailChange}
          onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
          className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-sm outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/30"
          aria-invalid={touched.email && !isEmailValid}
          aria-describedby={!isEmailValid && touched.email ? errorId : undefined}
        />
        {touched.email && !isEmailValid ? (
          <p id={errorId} className="text-xs text-rose-300">
            Enter a valid email address.
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <div role="alert" aria-live="polite" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      {message ? (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!isEmailValid || isSubmitting}
        className="flex w-full items-center justify-center rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {isSubmitting ? "Sending reset link..." : "Send reset link"}
      </button>
    </form>
  );
};

export default PasswordResetForm;
