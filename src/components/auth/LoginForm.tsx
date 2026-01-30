import { useCallback, useId, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import type { ApiErrorDTO, LoginCommand, LoginResponseDTO } from "@/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates that a redirect URL is safe (internal only)
 * Prevents open redirect vulnerabilities
 */
function isValidRedirectUrl(url: string): boolean {
  // Must start with / and not contain //
  if (!url.startsWith("/") || url.includes("//")) {
    return false;
  }
  // Prevent protocol-relative URLs
  if (url.startsWith("//")) {
    return false;
  }
  return true;
}

function getApiErrorMessage(error: ApiErrorDTO | null, fallback: string): string {
  if (!error) {
    return fallback;
  }

  if (error.code === "INVALID_CREDENTIALS") {
    return "Invalid email or password.";
  }

  if (error.code === "VALIDATION_ERROR") {
    return "Please check your details and try again.";
  }

  return fallback;
}

interface LoginFormProps {
  /** URL to redirect to after successful login */
  redirectTo?: string;
}

const LoginForm = ({ redirectTo }: LoginFormProps) => {
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const canSubmit = isEmailValid && password.length > 0 && !isSubmitting;

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    setApiError(null);
  }, []);

  const handlePasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    setApiError(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setApiError(null);

      if (!canSubmit) {
        return;
      }

      setIsSubmitting(true);

      try {
        const payload: LoginCommand = { email: email.trim(), password };
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include", // Important: include cookies in request
        });

        if (!response.ok) {
          const error = (await response.json().catch(() => null)) as ApiErrorDTO | null;
          setApiError(getApiErrorMessage(error, "Login failed. Please try again."));
          return;
        }

        // Session is now managed via httpOnly cookies set by the server
        // No need to store tokens in localStorage
        const data = (await response.json()) as LoginResponseDTO;

        if (data?.user) {
          // Determine redirect URL - validate if provided, default to dashboard
          const targetUrl = redirectTo && isValidRedirectUrl(redirectTo) ? redirectTo : "/dashboard";
          window.location.href = targetUrl;
        } else {
          setApiError("Login failed. Please try again.");
        }
      } catch {
        setApiError("Network error. Please check your connection and try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [canSubmit, email, password, redirectTo]
  );

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
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
          data-testid="login-email-input"
          className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-sm outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/30"
          aria-invalid={!isEmailValid && email.length > 0}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={passwordId} className="text-sm font-medium text-slate-200">
          Password
        </label>
        <div className="relative">
          <input
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={handlePasswordChange}
            data-testid="login-password-input"
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 pr-20 text-sm text-white shadow-sm outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/30"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-200 hover:text-emerald-100"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div className="flex justify-end text-sm">
        <a href="/reset-password" className="text-emerald-200 hover:text-emerald-100">
          Forgot password?
        </a>
      </div>

      {apiError ? (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          data-testid="login-error"
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {apiError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        data-testid="login-submit"
        className="flex w-full items-center justify-center rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-xs text-slate-400">Secure login uses encrypted sessions managed by the server.</p>
    </form>
  );
};

export default LoginForm;
