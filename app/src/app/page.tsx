import { redirect } from "next/navigation";
import { createClient } from "@/infrastructure/supabase/server";
import Landing from "@/components/Landing";

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }
  return <Landing />;
}
