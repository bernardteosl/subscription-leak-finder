"use client";

import { useState } from "react";
import type { Subscription } from "@/lib/types";
import { CYCLE_MONTHS, daysLeft, fmtDate, money, periodsElapsed } from "@/lib/money";

const HUES = [355, 27, 46, 152, 201, 248, 286];

export default function SubscriptionCard({
  sub,
  index,
  onEdit,
  onDelete,
  onUsesChange,
}: {
  sub: Subscription;
  index: number;
  onEdit: (sub: Subscription) => void;
  onDelete: (id: string) => void;
  onUsesChange: (id: string, next: number) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const h = HUES[index % HUES.length];

  const initial = (sub.name || "?").trim().charAt(0).toUpperCase();
  const priceLabel = `${money(sub.price)}${
    CYCLE_MONTHS[sub.cycle] === 1 ? "/mo" : `/${CYCLE_MONTHS[sub.cycle]}mo`
  }`;

  const periods = periodsElapsed(sub.start_date, sub.cycle);
  const totalPaid = periods * sub.price;
  const uses = Math.max(0, sub.uses || 0);
  const perUse = totalPaid / Math.max(uses, 1);

  let pill: { text: string; tone: "danger" | "warn" | "ok" } | null = null;
  if (sub.is_trial) {
    const dl = daysLeft(sub.trial_end);
    if (dl === null) {
      pill = { text: "Trial · no end date set", tone: "warn" };
    } else if (dl < 0) {
      pill = {
        text: `Trial ended ${fmtDate(sub.trial_end)} · check your bill`,
        tone: "danger",
      };
    } else if (dl <= 3) {
      pill = {
        text: `Cancel by ${fmtDate(sub.trial_end)} · ${dl} ${dl === 1 ? "day" : "days"} left`,
        tone: "danger",
      };
    } else if (dl <= 10) {
      pill = {
        text: `Cancel by ${fmtDate(sub.trial_end)} · ${dl} days left`,
        tone: "warn",
      };
    } else {
      pill = {
        text: `Cancel by ${fmtDate(sub.trial_end)} · ${dl} days left`,
        tone: "ok",
      };
    }
  } else if (sub.expiry_date) {
    const dl = daysLeft(sub.expiry_date);
    if (dl !== null) {
      if (dl < 0) {
        pill = {
          text: `Expired ${fmtDate(sub.expiry_date)} · check renewal`,
          tone: "danger",
        };
      } else if (dl <= 7) {
        pill = {
          text: `Expires ${fmtDate(sub.expiry_date)} · ${dl} ${dl === 1 ? "day" : "days"} left`,
          tone: "danger",
        };
      } else if (dl <= 14) {
        pill = {
          text: `Expires ${fmtDate(sub.expiry_date)} · ${dl} days left`,
          tone: "warn",
        };
      } else {
        pill = { text: `Expires ${fmtDate(sub.expiry_date)}`, tone: "ok" };
      }
    }
  }

  function handleDeleteClick() {
    if (confirmingDelete) {
      onDelete(sub.id);
      setConfirmingDelete(false);
    } else {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 2600);
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm min-w-0"
      style={{ ["--h" as string]: String(h) }}
    >
      <div className="chip-color absolute inset-x-0 top-0 h-1" />

      <div className="flex items-start gap-2.5">
        <div
          className="chip-color flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[15px] font-extrabold text-white"
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15.5px] font-extrabold">{sub.name}</div>
          <div className="text-[13px] text-muted tabular-nums">
            {priceLabel} · since {fmtDate(sub.start_date)}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(sub)}
            aria-label={`Edit ${sub.name}`}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            aria-label={
              confirmingDelete
                ? `Click again to confirm delete of ${sub.name}`
                : `Delete ${sub.name}`
            }
            className={`flex h-[26px] w-[26px] items-center justify-center rounded-lg text-[13px] font-bold ${
              confirmingDelete
                ? "bg-danger text-white"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {confirmingDelete ? "!" : "✕"}
          </button>
        </div>
      </div>

      {pill && (
        <span
          className={`mt-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${
            pill.tone === "danger"
              ? "bg-danger-bg text-danger"
              : pill.tone === "warn"
                ? "bg-warn-bg text-warn"
                : "bg-ok-bg text-ok"
          }`}
        >
          {pill.text}
        </span>
      )}

      <div className="mt-3 flex items-center justify-between gap-2.5 rounded-lg bg-surface-2 px-3 py-2.5">
        <div className="min-w-0 text-[12.5px] leading-snug text-muted">
          {uses > 0 ? (
            <>
              You paid <b className="font-extrabold text-foreground">{money(totalPaid)}</b>{" "}
              for <b className="font-extrabold text-foreground">{uses}</b>{" "}
              {uses === 1 ? "use" : "uses"} —{" "}
              <b className="font-extrabold text-foreground">{money(perUse)}</b>/use
            </>
          ) : (
            <>
              You paid <b className="font-extrabold text-foreground">{money(totalPaid)}</b>{" "}
              for <b className="font-extrabold text-foreground">0 uses</b> so far
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onUsesChange(sub.id, Math.max(0, uses - 1))}
            aria-label="Decrease use count"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-border bg-surface text-[14px] font-extrabold"
          >
            −
          </button>
          <span className="min-w-[18px] text-center text-[13px] font-extrabold tabular-nums">
            {uses}
          </span>
          <button
            type="button"
            onClick={() => onUsesChange(sub.id, uses + 1)}
            aria-label="I used this"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-border bg-surface text-[14px] font-extrabold"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
