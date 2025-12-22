// app/tasks/[id]/edit/page.tsx
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditTaskForm } from "./editTaskForm";
import { Task as TaskType } from "../../types";

type Task = TaskType & {
  owner_id: string;
  owner: { full_name: string; department: string };
};

export default async function EditTaskPage({
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
      status,
      cancel_reason,
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

  if (!task) notFound();

  // Fetch user profile for permissions
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, department")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  const canEdit =
    task.owner_id === user.id ||
    (profile?.role === "manager" &&
      task.owner?.department === profile.department) ||
    profile?.role === "admin";

  if (!canEdit) {
    redirect("/tasks");
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Task</h1>
      <EditTaskForm
        task={task as unknown as Task}
        userId={user.id}
        canEdit={canEdit}
      />
    </div>
  );
}
