import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { money, CYCLE_LABELS } from "@/lib/money";
import type { Subscription } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://subscription-leak-finder-theta.vercel.app";
const FROM = process.env.RESEND_FROM_EMAIL || "Subscription Leak Finder <onboarding@resend.dev>";

function daysUntil(dateStr: string, today: Date): number {
  const end = new Date(dateStr + "T00:00:00");
  const start = new Date(today.toISOString().slice(0, 10) + "T00:00:00");
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function emailHtml(sub: Subscription, daysLeft: number) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto">
      <h2 style="margin:0 0 8px">${sub.name} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}</h2>
      <p style="color:#555;line-height:1.5">
        ${money(sub.price)} · ${CYCLE_LABELS[sub.cycle]} plan, set to expire on
        <strong>${sub.expiry_date}</strong>. Renew it, cancel it, or just make sure you still want it.
      </p>
      <p><a href="${SITE_URL}" style="color:#1a1625;font-weight:700">Open Subscription Leak Finder →</a></p>
    </div>
  `;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }
  const resend = new Resend(resendKey);
  const admin = createAdminClient();

  const today = new Date();
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 14);

  const { data: candidates, error } = await admin
    .from("subscriptions")
    .select("*")
    .not("expiry_date", "is", null)
    .gte("expiry_date", today.toISOString().slice(0, 10))
    .lte("expiry_date", horizon.toISOString().slice(0, 10))
    .or("expiry_alert_14d_sent.eq.false,expiry_alert_7d_sent.eq.false");

  if (error) {
    console.error("expiry-alerts: query failed", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const rows = (candidates ?? []) as Subscription[];
  const emailCache = new Map<string, string | null>();
  const sent: { id: string; name: string; kind: "14d" | "7d" }[] = [];

  for (const sub of rows) {
    const dl = daysUntil(sub.expiry_date!, today);
    const due14 = !sub.expiry_alert_14d_sent && dl <= 14;
    const due7 = !sub.expiry_alert_7d_sent && dl <= 7;
    if (!due14 && !due7) continue;

    if (!emailCache.has(sub.user_id)) {
      const { data } = await admin.auth.admin.getUserById(sub.user_id);
      emailCache.set(sub.user_id, data.user?.email ?? null);
    }
    const toEmail = emailCache.get(sub.user_id);
    if (!toEmail) continue;

    const patch: Record<string, boolean> = {};

    if (due14) {
      const { error: sendError } = await resend.emails.send({
        from: FROM,
        to: toEmail,
        subject: `${sub.name} expires in ${dl} days`,
        html: emailHtml(sub, dl),
      });
      if (!sendError) {
        patch.expiry_alert_14d_sent = true;
        sent.push({ id: sub.id, name: sub.name, kind: "14d" });
      } else {
        console.error("expiry-alerts: resend failed (14d)", sendError);
      }
    }

    if (due7) {
      const { error: sendError } = await resend.emails.send({
        from: FROM,
        to: toEmail,
        subject: `${sub.name} expires in ${dl} days`,
        html: emailHtml(sub, dl),
      });
      if (!sendError) {
        patch.expiry_alert_7d_sent = true;
        sent.push({ id: sub.id, name: sub.name, kind: "7d" });
      } else {
        console.error("expiry-alerts: resend failed (7d)", sendError);
      }
    }

    if (Object.keys(patch).length > 0) {
      await admin.from("subscriptions").update(patch).eq("id", sub.id);
    }
  }

  return NextResponse.json({ checked: rows.length, sent });
}
