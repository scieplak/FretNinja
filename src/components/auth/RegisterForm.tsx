import { useCallback, useId, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import type { ApiErrorDTO, RegisterCommand, RegisterResponseDTO } from "@/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PasswordStrength = {
  label: "Weak" | "Fair" | "Strong";
  percent: number;
};

const getPasswordStrength = (value: string): PasswordStrength => {
  const lengthScore = value.length >= 12 ? 2 : value.length >= 8 ? 1 : 0;
  const varietyScore =
    Number(/[A-Z]/.test(value)) +
    Number(/[a-z]/.test(value)) +
    Number(/[0-9]/.test(value)) +
    Number(/[^A-Za-z0-9]/.test(value));
  const totalScore = lengthScore + (varietyScore >= 3 ? 1 : 0);

  if (totalScore >= 3) {
    return { label: "Strong", percent: 100 };
  }
  if (totalScore === 2) {
    return { label: "Fair", percent: 66 };
  }
  return { label: "Weak", percent: 33 };
};

const getApiErrorMessage = (error: ApiErrorDTO | null, fallback: string) => {
  if (!error) {
    return fallback;
  }

  if (error.code === "EMAIL_EXISTS") {
    return "An account with this email already exists.";
  }

  if (error.code === "VALIDATION_ERROR") {
    return "Please check your details and try again.";
  }

  return fallback;
};

const RegisterForm = () => {
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const strengthId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEmailValid = useMemo(() => EMAIL_REGEX.test(email.trim()), [email]);
  const isPasswordValid = useMemo(() => password.length >= 8, [password]);
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const canSubmit = isEmailValid && isPasswordValid && !isSubmitting;

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
      setTouched({ email: true, password: true });
      setApiError(null);
      setSuccessMessage(null);

      if (!canSubmit) {
        return;
      }

      setIsSubmitting(true);

      try {
        const payload: RegisterCommand = { email: email.trim(), password };
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = (await response.json().catch(() => null)) as ApiErrorDTO | null;
          setApiError(getApiErrorMessage(error, "Registration failed. Please try again."));
          return;
        }

        const data = (await response.json()) as RegisterResponseDTO;
        setSuccessMessage(data.message || "Account created! Redirecting to your dashboard...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1200);
      } catch (error) {
        setApiError("Network error. Please check your connection and try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [canSubmit, email, password]
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

      <div className="space-y-2">
        <label htmlFor={passwordId} className="text-sm font-medium text-slate-200">
          Password
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
            aria-describedby={strengthId}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-200 hover:text-emerald-100"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div className="space-y-1" id={strengthId}>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${strength.percent}%` }}
            />
          </div>
          <p className="text-xs text-slate-300">
            Strength: <span className="font-semibold text-slate-100">{strength.label}</span> · Minimum 8 characters
          </p>
          {touched.password && !isPasswordValid ? (
            <p className="text-xs text-rose-300">Password must be at least 8 characters.</p>
          ) : null}
        </div>
      </div>

      {apiError ? (
        <div role="alert" aria-live="polite" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {apiError}
        </div>
      ) : null}

      {successMessage ? (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {successMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex w-full items-center justify-center rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
};

export default RegisterForm;
