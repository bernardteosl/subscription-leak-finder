import type { Cycle, Subscription } from "./types";

export const CYCLE_MONTHS: Record<Cycle, number> = {
  monthly: 1,
  months_12: 12,
  months_24: 24,
  months_36: 36,
  months_48: 48,
};

export const CYCLE_LABELS: Record<Cycle, string> = {
  monthly: "Monthly",
  months_12: "12 Months",
  months_24: "24 Months",
  months_36: "36 Months",
  months_48: "48 Months",
};

export function money(n: number): string {
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  return (
    "$" +
    rounded.toFixed(2).replace(/\B(?=(\d{3})+(?!\d)\.)/g, ",")
  );
}

export function monthlyCost(sub: Pick<Subscription, "cycle" | "price">): number {
  return sub.price / CYCLE_MONTHS[sub.cycle];
}

export function yearlyCost(sub: Pick<Subscription, "cycle" | "price">): number {
  return monthlyCost(sub) * 12;
}

export function periodsElapsed(
  startStr: string,
  cycle: Subscription["cycle"],
): number {
  const start = new Date(startStr + "T00:00:00");
  const now = new Date();
  if (isNaN(start.getTime())) return 1;

  let monthsElapsed =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) monthsElapsed -= 1;
  monthsElapsed = Math.max(0, monthsElapsed);

  const cycleMonths = CYCLE_MONTHS[cycle];
  return Math.max(1, Math.floor(monthsElapsed / cycleMonths) + 1);
}

export function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr + "T23:59:59");
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}-${MONTH_ABBR[d.getMonth()]}-${d.getFullYear()}`;
}

export function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
