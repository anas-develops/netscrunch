import { redirect } from "next/navigation";
import TasksClient from "./tasksClient";
import { fetchTasks, fetchTeamMembers } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { Owner, Task } from "./types";

const TASK_TYPES = ["Call", "Email", "Message", "Proposal", "Follow-up"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: {
    view?: string;
    search?: string;
    type?: string;
    owner?: string;
    page?: string;
  };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, department")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  const routeSearchParams = await searchParams;

  const view =
    routeSearchParams.view === "team" && profile.role === "manager"
      ? "team"
      : "my";

  const currentPage = parseInt(routeSearchParams.page || "1", 10) || 1;

  // Fetch tasks
  const { tasks, count } = await fetchTasks(
    view,
    user.id,
    profile.role,
    profile.department,
    routeSearchParams.search || null,
    routeSearchParams.type || null,
    routeSearchParams.owner || null,
    20,
    currentPage
  );

  // Fetch team members if needed
  let teamMembers: Owner[] = [];
  if (view === "team") {
    teamMembers = await fetchTeamMembers(profile.department);
  }

  return (
    <TasksClient
      initialData={{
        tasks: (tasks as unknown as Task[]) || [],
        count,
        teamMembers,
        currentUser: { id: user.id, name: profile.full_name! },
      }}
      filters={{
        view,
        search: routeSearchParams.search || "",
        type: routeSearchParams.type || "all",
        owner: routeSearchParams.owner || "all",
      }}
      role={profile.role}
    />
  );
}
