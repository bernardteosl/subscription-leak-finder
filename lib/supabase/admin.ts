import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for server-only jobs (the expiry-alert cron) that need
// to read and update every user's rows, bypassing RLS. Never import this
// from client code or anywhere reachable by the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
