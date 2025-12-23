// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  //   // Only admins can view full dashboard
  //   if (profile?.role !== "admin") {
  //     // Redirect sales reps to /tasks, managers to team view
  //     redirect(profile?.role === "manager" ? "/tasks?view=team" : "/tasks");
  //   }

  // Fetch dashboard metrics
  const { data: metrics } = await supabase.rpc("get_dashboard_metrics");

  console.log("metrics", metrics);

  return <DashboardClient metrics={metrics} />;
}
