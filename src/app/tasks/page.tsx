// app/tasks/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TasksClient } from "./tasksClient";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { view?: string }; // 'my' or 'team'
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch user profile to determine role + department
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, department")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  // Default to 'my' for sales reps, 'team' for managers
  const view =
    searchParams.view || (profile.role === "manager" ? "team" : "my");

  // Fetch tasks based on view
  let tasks;
  if (view === "team") {
    // Managers see all tasks in their department
    const { data: teamTasks } = await supabase
      .from("tasks")
      .select(
        `
        id,
        type,
        description,
        due_date,
        completed,
        owner_id,
        leads(name, company),
        deals(name),
        profiles!owner_id(full_name)
      `
      )
      .eq("profiles.department", profile.department)
      .order("due_date", { ascending: true });
    tasks = teamTasks;
  } else {
    // Default: "My Tasks"
    const { data: myTasks } = await supabase
      .from("tasks")
      .select(
        `
        id,
        type,
        description,
        due_date,
        completed,
        owner_id,
        leads(name, company),
        deals(name),
        profiles!owner_id(full_name)
      `
      )
      .eq("owner_id", user.id)
      .order("due_date", { ascending: true });
    tasks = myTasks;
  }

  // Group tasks for UI
  const today = new Date().toISOString().split("T")[0];
  const overdue =
    tasks?.filter((t: any) => !t.completed && t.due_date < today) || [];
  const dueToday =
    tasks?.filter((t: any) => !t.completed && t.due_date === today) || [];
  const upcoming =
    tasks?.filter((t: any) => !t.completed && t.due_date > today) || [];

  return (
    <TasksClient
      initialTasks={{ overdue, dueToday, upcoming }}
      currentView={view}
      role={profile.role}
      userId={user.id}
    />
  );
}
