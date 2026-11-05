"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "../logo";

type Mode = "signin" | "signup";
type Status = { kind: "error" | "info"; text: string } | null;

export default function LoginForm({
  next,
  initialError,
}: {
  next: string;
  initialError: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(
    initialError ? { kind: "error", text: initialError } : null,
  );

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : undefined;

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!email || !password) {
      setStatus({ kind: "error", text: "Enter both an email and a password." });
      return;
    }
    if (password.length < 6) {
      setStatus({ kind: "error", text: "Password needs to be at least 6 characters." });
      return;
    }
    setBusy(mode);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setStatus({
            kind: "info",
            text: "Check your inbox to confirm your email, then sign in.",
          });
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      setStatus({
        kind: "error",
        text: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleMagicLink() {
    setStatus(null);
    if (!email) {
      setStatus({ kind: "error", text: "Enter your email first." });
      return;
    }
    setBusy("magic");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setStatus({
        kind: "info",
        text: `We sent a sign-in link to ${email}. Open it on this device.`,
      });
    } catch (err) {
      setStatus({
        kind: "error",
        text: err instanceof Error ? err.message : "Couldn't send the link.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    setStatus(null);
    setBusy(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setStatus({ kind: "error", text: error.message });
      setBusy(null);
    }
    // on success the browser navigates away to the provider
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="bg-surface border border-border rounded-2xl shadow-sm p-6 relative overflow-hidden">
          <div className="rainbow-rule absolute inset-x-0 top-0 rounded-none h-1" />

          <div className="flex rounded-full bg-surface-2 border border-border p-1 mb-5 text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setStatus(null);
              }}
              className={`flex-1 rounded-full py-1.5 transition ${
                mode === "signin"
                  ? "bg-foreground text-background"
                  : "text-muted"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setStatus(null);
              }}
              className={`flex-1 rounded-full py-1.5 transition ${
                mode === "signup"
                  ? "bg-foreground text-background"
                  : "text-muted"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handlePasswordSubmit} noValidate className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-xs font-bold text-muted">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(201_85%_55%)]"
                placeholder="you@example.com"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs font-bold text-muted">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(201_85%_55%)]"
                placeholder="At least 6 characters"
              />
            </div>

            {status && (
              <p
                role="alert"
                className={`text-xs font-medium ${
                  status.kind === "error" ? "text-danger" : "text-ok"
                }`}
              >
                {status.text}
              </p>
            )}

            <button
              type="submit"
              disabled={busy !== null}
              className="mt-1 rounded-full bg-foreground text-background text-sm font-bold py-2.5 disabled:opacity-60"
            >
              {busy === mode
                ? "Working…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={busy !== null}
            className="w-full mt-3 rounded-full border border-border text-sm font-semibold py-2.5 text-foreground disabled:opacity-60"
          >
            {busy === "magic" ? "Sending…" : "Email me a magic link instead"}
          </button>

          <div className="flex items-center gap-3 my-5">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold text-muted uppercase">
              or continue with
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={busy !== null}
              className="flex items-center justify-center gap-2 rounded-full border border-border bg-surface-2 text-sm font-semibold py-2.5 disabled:opacity-60"
            >
              <GoogleMark />
              {busy === "google" ? "Redirecting…" : "Google"}
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("github")}
              disabled={busy !== null}
              className="flex items-center justify-center gap-2 rounded-full border border-border bg-surface-2 text-sm font-semibold py-2.5 disabled:opacity-60"
            >
              <GitHubMark />
              {busy === "github" ? "Redirecting…" : "GitHub"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted mt-5">
          Your subscriptions are private to your account and protected by
          row-level security in the database.
        </p>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35.1 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.9 39.6 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.6 36.1 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.38 7.86 10.9.57.1.78-.25.78-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.19 1.78 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.58.24 2.75.12 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.2.67.79.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}
