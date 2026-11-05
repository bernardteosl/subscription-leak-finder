import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const metadata = (user.user_metadata ?? {}) as {
    first_name?: string;
    last_name?: string;
  };

  return (
    <OnboardingForm
      initialFirstName={metadata.first_name ?? ""}
      initialLastName={metadata.last_name ?? ""}
    />
  );
}
