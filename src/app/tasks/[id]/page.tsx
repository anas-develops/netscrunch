import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ViewTaskClient } from "./viewTaskClient";
import { Task as TaskType } from "../types";

type Task = TaskType & {
  owner_id: string;
  owner: { full_name: string; department: string };
};

export default async function ViewTaskPage({
  params,
}: {
  params: { id: string };
}) {
  const routeParams = await params;
  const taskId = routeParams.id;
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch task with related data
  const {
    data: task,
  }: {
    data:
      | (Task & {
          owner_id: string;
          owner: { full_name: string; department: string };
        })
      | null;
  } = await supabase
    .from("tasks")
    .select(
      `
      id,
      type,
      description,
      due_date,
      completed,
      owner_id,
      lead_id,
      deal_id,
      owner:owner_id (full_name, department),
      lead:lead_id (name, company, owner_id),
      deal:deal_id (lead_name, lead_company, owner_id)
    `
    )
    .eq("id", taskId)
    .single();

  if (!task) {
    notFound();
  }

  // Optional: Fetch current user's role for action permissions
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, department")
    .eq("id", user.id)
    .single();

  // Security: Only owner, manager (same dept), or admin can view
  const canEdit =
    task.owner_id === user.id ||
    (profile?.role === "manager" &&
      profile.department === task.owner.department) ||
    profile?.role === "admin";

  if (!canEdit) {
    // Optional: Redirect to tasks list or show "unauthorized"
    redirect("/tasks");
  }

  return <ViewTaskClient task={task} userId={user.id} canEdit={canEdit} />;
}
