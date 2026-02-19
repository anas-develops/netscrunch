"use server";

import { createClient } from "@/lib/supabase/server";

export type TimePeriod = "daily" | "weekly" | "monthly" | "quarterly";

export async function fetchDashboardMetrics(timePeriod: TimePeriod) {
  const supabase = await createClient();
  const { data: metrics } = await supabase.rpc("get_dashboard_metrics", {
    time_period: timePeriod,
  });
  return metrics;
}
