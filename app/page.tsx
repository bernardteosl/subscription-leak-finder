import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "./dashboard";
import type { Subscription } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: true });

  const metadata = (user.user_metadata ?? {}) as {
    first_name?: string;
    last_name?: string;
  };
  const userName = [metadata.first_name, metadata.last_name].filter(Boolean).join(" ");

  return (
    <Dashboard
      userId={user.id}
      userEmail={user.email ?? ""}
      userName={userName}
      initialSubscriptions={(subscriptions ?? []) as Subscription[]}
    />
  );
}
