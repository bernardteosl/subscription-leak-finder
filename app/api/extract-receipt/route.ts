import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // stay under Vercel's request body limit
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-5.5";

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "The service or merchant name, e.g. 'Netflix' or 'Adobe Creative Cloud'.",
    },
    price: {
      type: "number",
      description: "The charge amount as a plain number, no currency symbol (e.g. 15.99).",
    },
    cycle: {
      type: "string",
      enum: ["monthly", "months_12", "months_24", "months_36", "months_48"],
      description: "Billing/term length. Pick the closest match: 'monthly' for a monthly charge, 'months_12' for an annual/yearly plan, 'months_24'/'months_36'/'months_48' for a multi-year prepaid term. If unclear, use 'monthly'.",
    },
    start_date: {
      type: "string",
      description: "The invoice/charge date in YYYY-MM-DD format, if visible on the document.",
    },
    is_trial: {
      type: "boolean",
      description: "True only if the document explicitly describes a free trial that will convert to paid.",
    },
    trial_end: {
      type: ["string", "null"],
      description: "Trial end / cancel-by date in YYYY-MM-DD, only if is_trial is true and a date is visible. Otherwise null.",
    },
    expiry_date: {
      type: ["string", "null"],
      description: "The plan's renewal/expiry date in YYYY-MM-DD, only if the document explicitly states one (common for multi-month/year prepaid terms, domains, VPNs, etc.). Otherwise null.",
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "How confident you are that this is a correct, complete reading of the document.",
    },
    notes: {
      type: "string",
      description: "One short sentence on anything the user should double-check, or empty string if none.",
    },
  },
  required: ["name", "price", "cycle", "is_trial", "confidence"],
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Receipt scanning isn't configured yet (missing OPENROUTER_API_KEY)." },
      { status: 500 },
    );
  }

  let file: File;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (!(f instanceof File)) {
      return NextResponse.json({ error: "No file received." }, { status: 400 });
    }
    file = f;
  } catch {
    return NextResponse.json({ error: "Couldn't read the upload." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Upload a JPEG, PNG, WEBP, GIF image, or a PDF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That file is too big — please upload one under 4MB." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");

  const documentPart =
    file.type === "application/pdf"
      ? {
          type: "file" as const,
          file: {
            filename: file.name || "document.pdf",
            file_data: `data:application/pdf;base64,${base64}`,
          },
        }
      : {
          type: "image_url" as const,
          image_url: { url: `data:${file.type};base64,${base64}` },
        };

  const today = new Date().toISOString().slice(0, 10);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://subscription-leak-finder-theta.vercel.app",
        "X-Title": "Subscription Leak Finder",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `This is a receipt, invoice, or subscription confirmation. You must call the record_subscription tool with your best reading of it — never reply in plain text. Today's date is ${today} — use it only to help judge the billing cycle, not as the charge date itself.`,
              },
              documentPart,
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "record_subscription",
              description:
                "Record the subscription details read from a receipt, invoice, or confirmation email screenshot.",
              parameters: EXTRACTION_SCHEMA,
            },
          },
        ],
        // Claude Sonnet 5.5 (and some other models behind OpenRouter) reject a
        // forced tool_choice ("tool"/"any") as unsupported — "auto" plus an
        // explicit instruction in the prompt is what actually works.
        tool_choice: "auto",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("extract-receipt: openrouter error", res.status, body);
      return NextResponse.json(
        { error: "Couldn't read that file — try a clearer photo or fill it in manually." },
        { status: 502 },
      );
    }

    const json = await res.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return NextResponse.json(
        { error: "Couldn't make out any subscription details in that file." },
        { status: 422 },
      );
    }

    const input = JSON.parse(toolCall.function.arguments) as {
      name: string;
      price: number;
      cycle: "monthly" | "months_12" | "months_24" | "months_36" | "months_48";
      start_date?: string;
      is_trial: boolean;
      trial_end?: string | null;
      expiry_date?: string | null;
      confidence: "high" | "medium" | "low";
      notes?: string;
    };

    const isDate = (s: string | null | undefined): s is string =>
      !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

    return NextResponse.json({
      name: input.name,
      price: input.price,
      cycle: input.cycle,
      start_date: isDate(input.start_date) ? input.start_date : today,
      uses: 0,
      is_trial: input.is_trial,
      trial_end: input.is_trial && isDate(input.trial_end) ? input.trial_end : null,
      expiry_date: isDate(input.expiry_date) ? input.expiry_date : null,
      confidence: input.confidence,
      notes: input.notes ?? "",
    });
  } catch (err) {
    console.error("extract-receipt failed", err);
    return NextResponse.json(
      { error: "Couldn't read that file — try a clearer photo or fill it in manually." },
      { status: 500 },
    );
  }
}
