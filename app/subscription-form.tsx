"use client";

import { useEffect, useState } from "react";
import type { Cycle, Subscription, SubscriptionInput } from "@/lib/types";
import { CYCLE_LABELS, todayStr } from "@/lib/money";

export type ExtractedSubscription = SubscriptionInput & {
  confidence?: "high" | "medium" | "low";
  notes?: string;
};

const CYCLE_OPTIONS: Cycle[] = ["monthly", "months_12", "months_24", "months_36", "months_48"];

export default function SubscriptionForm({
  editing,
  initial,
  onCancel,
  onSubmit,
}: {
  editing: Subscription | null;
  initial?: ExtractedSubscription | null;
  onCancel: () => void;
  onSubmit: (data: SubscriptionInput) => Promise<void>;
}) {
  const seed = editing ?? initial ?? null;
  const [name, setName] = useState(seed?.name ?? "");
  const [price, setPrice] = useState(seed ? String(seed.price) : "");
  const [cycle, setCycle] = useState<Cycle>(seed?.cycle ?? "monthly");
  const [start, setStart] = useState(seed?.start_date ?? todayStr());
  const [uses, setUses] = useState(seed ? String(seed.uses) : "0");
  const [isTrial, setIsTrial] = useState(seed?.is_trial ?? false);
  const [trialEnd, setTrialEnd] = useState(seed?.trial_end ?? "");
  const [expiryDate, setExpiryDate] = useState(seed?.expiry_date ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = editing ?? initial ?? null;
    setName(s?.name ?? "");
    setPrice(s ? String(s.price) : "");
    setCycle(s?.cycle ?? "monthly");
    setStart(s?.start_date ?? todayStr());
    setUses(s ? String(s.uses) : "0");
    setIsTrial(s?.is_trial ?? false);
    setTrialEnd(s?.trial_end ?? "");
    setExpiryDate(s?.expiry_date ?? "");
    setError("");
  }, [editing, initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = parseFloat(price);
    const usesNum = parseInt(uses, 10) || 0;

    if (!name.trim()) return setError("Give it a name.");
    if (!(priceNum >= 0)) return setError("Enter a price of 0 or more.");
    if (!start) return setError("Pick a start date.");
    if (isTrial && !trialEnd) return setError("Add the cancel-by date for the trial.");

    setError("");
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        price: priceNum,
        cycle,
        start_date: start,
        uses: usesNum,
        is_trial: isTrial,
        trial_end: isTrial ? trialEnd : null,
        expiry_date: expiryDate || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-3.5 rounded-2xl border border-border bg-surface p-4.5 shadow-sm sm:p-[18px]"
    >
      <h3 className="mb-3.5 text-[15px] font-extrabold">
        {editing ? "Edit subscription" : "Add a subscription"}
      </h3>

      {!editing && initial && (
        <div className="mb-3.5 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-xs">
          <p className="font-bold text-foreground">
            Filled in from your upload
            {initial.confidence === "low" && " — low confidence, check carefully"}
            {initial.confidence === "medium" && " — double-check the numbers"}
          </p>
          <p className="mt-0.5 text-muted">
            {initial.notes || "Review the fields below, then save."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="f-name" full>
          <input
            id="f-name"
            type="text"
            maxLength={60}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Streamflix"
            className="input"
          />
        </Field>
        <Field label="Price (USD)" htmlFor="f-price">
          <input
            id="f-price"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="9.99"
            className="input"
          />
        </Field>
        <Field label="Billing cycle" htmlFor="f-cycle">
          <select
            id="f-cycle"
            value={cycle}
            onChange={(e) => setCycle(e.target.value as Cycle)}
            className="input"
          >
            {CYCLE_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CYCLE_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start / signup date" htmlFor="f-start">
          <input
            id="f-start"
            type="date"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Times used so far" htmlFor="f-uses">
          <input
            id="f-uses"
            type="number"
            min={0}
            step={1}
            value={uses}
            onChange={(e) => setUses(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Renews / expires on (optional)" htmlFor="f-expiry">
          <input
            id="f-expiry"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="input"
          />
        </Field>
      </div>

      {expiryDate && (
        <p className="mt-2 text-[11.5px] text-muted">
          You&rsquo;ll get an email 2 weeks and 1 week before this renewal/expiry date.
        </p>
      )}

      <label className="mt-3.5 flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={isTrial}
          onChange={(e) => setIsTrial(e.target.checked)}
          className="h-4 w-4"
        />
        This is a free trial that will roll into a paid plan
      </label>

      {isTrial && (
        <div className="mt-2.5 rounded-xl border border-dashed border-border bg-surface-2 p-3">
          <Field label="Cancel-by date" htmlFor="f-trialend">
            <input
              id="f-trialend"
              type="date"
              value={trialEnd}
              onChange={(e) => setTrialEnd(e.target.value)}
              className="input"
            />
          </Field>
          <p className="mt-1.5 text-[11.5px] text-muted">
            This is separate from the renewal/expiry date above — it&rsquo;s when the free
            trial ends and billing would start, so you know when to cancel.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 min-h-[1em] text-[12.5px] font-medium text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold text-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-foreground px-4.5 py-2 text-sm font-bold text-background disabled:opacity-60"
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Save"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  full,
  children,
}: {
  label: string;
  htmlFor: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${full ? "col-span-full" : ""}`}>
      <label htmlFor={htmlFor} className="text-xs font-bold text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
