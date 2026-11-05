"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "../logo";

export default function OnboardingForm({
  initialFirstName,
  initialLastName,
}: {
  initialFirstName: string;
  initialLastName: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Enter both your first and last name.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
      });
      if (updateError) throw updateError;
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="bg-surface border border-border rounded-2xl shadow-sm p-6 relative overflow-hidden">
          <div className="rainbow-rule absolute inset-x-0 top-0 rounded-none h-1" />

          <h1 className="text-lg font-extrabold mb-1">Welcome — what's your name?</h1>
          <p className="text-sm text-muted mb-5">
            Just so we know who&rsquo;s tracking all these subscriptions.
          </p>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="first-name" className="text-xs font-bold text-muted">
                First name
              </label>
              <input
                id="first-name"
                type="text"
                autoComplete="given-name"
                required
                maxLength={60}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(201_85%_55%)]"
                placeholder="Ada"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="last-name" className="text-xs font-bold text-muted">
                Last name
              </label>
              <input
                id="last-name"
                type="text"
                autoComplete="family-name"
                required
                maxLength={60}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(201_85%_55%)]"
                placeholder="Lovelace"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs font-medium text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-1 rounded-full bg-foreground text-background text-sm font-bold py-2.5 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
