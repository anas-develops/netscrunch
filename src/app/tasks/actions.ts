// app/tasks/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { Owner, Task } from "./types";

export async function fetchTasks(
  view: "my" | "team",
  userId: string,
  userRole: string,
  userDepartment: string,
  search?: string | null,
  typeFilter?: string | null,
  ownerFilter?: string | null,
  pageSize: number = 20,
  currentPage: number = 1
): Promise<{ tasks: Task[]; count: number }> {
  const supabase = await createClient();

  // Base query
  let query = supabase
    .from("tasks")
    .select(
      `
        id,
        type,
        description,
        due_date,
        owner_id,
        lead_id,
        deal_id,
        created_at,
        owner:owner_id (full_name, role, department),
        lead:lead_id (name, company),
        deal:deal_id (id, owner_name, lead_name, lead_company)
      `,
      { count: "exact" }
    )
    .order("due_date", { ascending: true }) // sort by urgency (soonest first)
    .eq("status", "pending"); // only show incomplete tasks

  // Apply view filter
  if (view === "my") {
    query = query.eq("owner_id", userId);
  } else if (view === "team" && userRole === "manager") {
    // Only managers can see team view
    query = query.eq("owner.department", userDepartment);
  } else {
    // Fallback to "my" for non-managers
    query = query.eq("owner_id", userId);
  }

  // Search: task description, lead name, deal name
  if (search) {
    const term = search.trim();
    if (term) {
      query = query.or(`description.ilike.%${term}%`);
    }
  }

  // Type filter
  if (typeFilter && typeFilter !== "all") {
    query = query.eq("type", typeFilter);
  }

  // Owner filter (team view only)
  if (view === "team" && ownerFilter && ownerFilter !== "all") {
    query = query.eq("owner_id", ownerFilter);
  }

  // Paginate
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: tasks, error, count } = await query.range(from, to);

  if (error) throw error;

  return {
    tasks: (tasks as unknown as Task[]) || [],
    count: count || 0,
  };
}

// Fetch team members for filter dropdown (managers only)
export async function fetchTeamMembers(department: string): Promise<Owner[]> {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("department", department);
  return members as unknown as Owner[];
}
