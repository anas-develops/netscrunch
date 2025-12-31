import { redirect } from "next/navigation";
import { GlobalActivityClient } from "./globalActivityClient";
import { fetchGlobalActivities, fetchTeamMembers } from "./actions";
import { createClient } from "@/lib/supabase/server";

const ENTITY_TYPES = ["all", "lead", "deal", "task"];
const SOURCES = [
  "all",
  "Upwork",
  "Recruitment",
  "B2B",
  "Freelancer",
  "Referral",
];

export default async function GlobalActivityPage({
  searchParams,
}: {
  searchParams: {
    user?: string;
    startDate?: string;
    endDate?: string;
    entityType?: string;
    source?: string;
    page?: string;
  };
}) {
  const routeSearchParams = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, department")
    .eq("id", user.id)
    .single();

  // Only admin/manager can access
  if (profile?.role !== "admin" && profile?.role !== "manager") {
    redirect("/dashboard");
  }

  const currentPage = parseInt(routeSearchParams.page || "1", 10) || 1;

  // Fetch data
  const filters = {
    userId: routeSearchParams.user || null,
    startDate: routeSearchParams.startDate || null,
    endDate: routeSearchParams.endDate || null,
    entityType: routeSearchParams.entityType || "all",
    source: routeSearchParams.source || "all",
  };

  const { activities, count } = await fetchGlobalActivities(
    filters,
    currentPage
  );
  const teamMembers = await fetchTeamMembers();

  return (
    <GlobalActivityClient
      initialData={{ activities, count, teamMembers }}
      filters={filters}
      currentPage={currentPage}
      role={profile.role}
    />
  );
}
