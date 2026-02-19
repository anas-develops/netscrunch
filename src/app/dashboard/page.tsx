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

  // Fetch dashboard metrics
  const { data: metrics } = await supabase.rpc("get_dashboard_metrics", {
    time_period: "weekly",
  });

  return (
    <DashboardClient
      metrics={metrics}
      userRole={profile?.role || "sales_rep"}
    />
  );
}
