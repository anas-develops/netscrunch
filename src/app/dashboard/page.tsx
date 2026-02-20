// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboardClient";
import type { TimePeriod } from "./actions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ time_period?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  // Get time period from search params, default to weekly
  const params = await searchParams;
  const timePeriod = (params.time_period as TimePeriod) || "weekly";

  // Fetch dashboard metrics
  const { data: metrics } = await supabase.rpc("get_dashboard_metrics", {
    time_period: timePeriod,
  });

  console.log("metrics", metrics);

  return (
    <DashboardClient
      metrics={metrics}
      userRole={profile?.role || "sales_rep"}
      userName={profile?.full_name || "-"}
      timePeriod={timePeriod}
    />
  );
}
