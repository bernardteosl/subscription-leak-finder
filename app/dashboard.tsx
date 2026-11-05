"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Subscription, SubscriptionInput } from "@/lib/types";
import { daysLeft, money, monthlyCost, yearlyCost } from "@/lib/money";
import SubscriptionCard from "./subscription-card";
import SubscriptionForm, { type ExtractedSubscription } from "./subscription-form";
import Logo from "./logo";
import UserMenu from "./user-menu";

const HUES = [355, 27, 46, 152, 201, 248, 286];
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export default function Dashboard({
  userId,
  userEmail,
  userName,
  initialSubscriptions,
}: {
  userId: string;
  userEmail: string;
  userName?: string;
  initialSubscriptions: Subscription[];
}) {
  const supabase = createClient();
  const [subs, setSubs] = useState<Subscription[]>(initialSubscriptions);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [prefill, setPrefill] = useState<ExtractedSubscription | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastTimer, setToastTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null,
  );

  function toast(msg: string) {
    setToastMsg(msg);
    if (toastTimer) clearTimeout(toastTimer);
    setToastTimer(setTimeout(() => setToastMsg(null), 2200));
  }

  const stats = useMemo(() => {
    let activeMonthly = 0;
    let activeYearly = 0;
    let trialCount = 0;
    let trialMonthlyIfConverted = 0;
    let soonestTrialDays: number | null = null;

    for (const s of subs) {
      if (s.is_trial) {
        trialCount++;
        trialMonthlyIfConverted += monthlyCost(s);
        const dl = daysLeft(s.trial_end);
        if (dl !== null && (soonestTrialDays === null || dl < soonestTrialDays)) {
          soonestTrialDays = dl;
        }
      } else {
        activeMonthly += monthlyCost(s);
        activeYearly += yearlyCost(s);
      }
    }
    return {
      activeMonthly,
      activeYearly,
      trialCount,
      trialMonthlyIfConverted,
      soonestTrialDays,
    };
  }, [subs]);

  const sorted = useMemo(() => {
    const list = subs.slice();
    list.sort((a, b) => {
      if (a.is_trial && b.is_trial) {
        const da = daysLeft(a.trial_end);
        const db = daysLeft(b.trial_end);
        return (da ?? 9999) - (db ?? 9999);
      }
      if (a.is_trial !== b.is_trial) return a.is_trial ? -1 : 1;
      return monthlyCost(b) - monthlyCost(a);
    });
    return list;
  }, [subs]);

  async function handleCreate(data: SubscriptionInput) {
    const { data: row, error } = await supabase
      .from("subscriptions")
      .insert({ ...data, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    setSubs((prev) => [...prev, row as Subscription]);
    toast(`Added ${data.name}`);
    setFormOpen(false);
    setPrefill(null);
  }

  async function handleUpdate(id: string, data: SubscriptionInput) {
    const { data: row, error } = await supabase
      .from("subscriptions")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    setSubs((prev) => prev.map((s) => (s.id === id ? (row as Subscription) : s)));
    toast("Saved changes");
    setFormOpen(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    const target = subs.find((s) => s.id === id);
    const prev = subs;
    setSubs((cur) => cur.filter((s) => s.id !== id));
    const { error } = await supabase.from("subscriptions").delete().eq("id", id);
    if (error) {
      setSubs(prev);
      toast("Couldn't delete — try again");
      return;
    }
    toast(`Deleted ${target?.name ?? "subscription"}`);
  }

  async function handleUsesChange(id: string, next: number) {
    const prev = subs;
    setSubs((cur) => cur.map((s) => (s.id === id ? { ...s, uses: next } : s)));
    const { error } = await supabase
      .from("subscriptions")
      .update({ uses: next })
      .eq("id", id);
    if (error) {
      setSubs(prev);
      toast("Couldn't sync — try again");
    }
  }

  function openAddForm() {
    setEditing(null);
    setPrefill(null);
    setFormOpen(true);
  }
  function openEditForm(sub: Subscription) {
    setEditing(sub);
    setPrefill(null);
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setPrefill(null);
  }

  function pickReceiptFile() {
    setUploadError(null);
    fileInputRef.current?.click();
  }

  async function handleReceiptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;

    setUploadError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError("Upload a JPEG, PNG, WEBP, GIF image, or a PDF.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("That file is too big — please upload one under 4MB.");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/extract-receipt", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setUploadError(json.error ?? "Couldn't read that file.");
        return;
      }
      setEditing(null);
      setPrefill(json as ExtractedSubscription);
      setFormOpen(true);
    } catch {
      setUploadError("Couldn't reach the server — try again.");
    } finally {
      setUploading(false);
    }
  }

  const trialSub = stats.trialCount
    ? stats.soonestTrialDays !== null
      ? stats.soonestTrialDays < 0
        ? "may already be billing"
        : `${stats.soonestTrialDays}d to next cancel-by`
      : ""
    : "none active";

  const statCells = [
    {
      h: HUES[0],
      label: "True monthly total",
      value: money(stats.activeMonthly),
      sub: "what you're paying right now",
      hot: false,
    },
    {
      h: HUES[3],
      label: "True yearly total",
      value: money(stats.activeYearly),
      sub: "same subscriptions, annualized",
      hot: false,
    },
    {
      h: HUES[1],
      label: "Active free trials",
      value: String(stats.trialCount),
      sub:
        (stats.trialCount ? `+${money(stats.trialMonthlyIfConverted)}/mo if kept — ` : "") +
        trialSub,
      hot: stats.soonestTrialDays !== null && stats.soonestTrialDays <= 3,
    },
    {
      h: HUES[5],
      label: "Tracked",
      value: String(subs.length),
      sub: subs.length === 1 ? "subscription" : "subscriptions",
      hot: false,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[900px] px-4 pb-16">
      <header className="pb-7 pt-9">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <Logo />
          <UserMenu userName={userName} userEmail={userEmail} />
        </div>
        <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[36px]">
          Where&rsquo;s the money actually going?
        </h1>
        <p className="mt-2 max-w-[520px] text-[15px] leading-relaxed text-muted">
          Every trial you forgot to cancel and every app you pay for and never
          open, in one list.
        </p>
        <div className="rainbow-rule mt-5" />
      </header>

      <section aria-label="Spending summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCells.map((c) => (
            <div
              key={c.label}
              className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm"
              style={{ ["--h" as string]: String(c.h) }}
            >
              <div className="chip-color absolute inset-x-0 top-0 h-1" />
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                {c.label}
              </div>
              <div className="mt-1.5 text-[22px] font-extrabold tracking-tight tabular-nums sm:text-[26px]">
                {c.value}
              </div>
              <div
                className={`mt-1 text-xs ${c.hot ? "font-bold text-danger" : "text-muted"}`}
              >
                {c.sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Manage subscriptions" className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Your subscriptions</h2>
          {!formOpen && (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={handleReceiptFile}
                className="hidden"
                aria-label="Upload a receipt or invoice"
              />
              <button
                type="button"
                onClick={pickReceiptFile}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-bold text-foreground disabled:opacity-60"
              >
                {uploading ? "Reading…" : "📄 Upload receipt"}
              </button>
              <button
                type="button"
                onClick={openAddForm}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4.5 py-2.5 text-sm font-bold text-background"
              >
                + Add subscription
              </button>
            </div>
          )}
        </div>

        {uploadError && !formOpen && (
          <p role="alert" className="mt-2.5 text-xs font-medium text-danger">
            {uploadError}
          </p>
        )}

        {formOpen && (
          <SubscriptionForm
            editing={editing}
            initial={prefill}
            onCancel={closeForm}
            onSubmit={(data) =>
              editing ? handleUpdate(editing.id, data) : handleCreate(data)
            }
          />
        )}

        {sorted.length === 0 ? (
          <div className="mt-4.5 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-muted">
            <div
              className="mx-auto mb-3.5 h-13 w-13 rounded-full"
              style={{
                background:
                  "conic-gradient(from 90deg, hsl(355 80% 55%), hsl(46 80% 55%), hsl(152 70% 42%), hsl(201 80% 55%), hsl(286 80% 60%), hsl(355 80% 55%))",
              }}
            />
            <h3 className="mb-1.5 text-base font-extrabold text-foreground">
              Nothing tracked yet
            </h3>
            <p className="text-[13.5px]">
              Add the first subscription above — start with the one
              you&rsquo;re least sure you still use.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {sorted.map((sub, i) => (
              <SubscriptionCard
                key={sub.id}
                sub={sub}
                index={i}
                onEdit={openEditForm}
                onDelete={handleDelete}
                onUsesChange={handleUsesChange}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 border-t border-border pt-4.5 text-xs leading-relaxed text-muted">
        Signed in as {userName ? `${userName} (${userEmail})` : userEmail}. Your
        subscription list is private to your account and protected by
        row-level security in the database.
      </footer>

      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4.5 py-2.5 text-sm font-bold text-background shadow-lg transition-all ${
          toastMsg ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {toastMsg}
      </div>
    </main>
  );
}
