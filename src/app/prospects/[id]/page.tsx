import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IntendedCustomerProfile, Prospect, Task } from "../types";
import ProspectDetailClient from "./prospectDetailClient";

export default async function ViewProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const routeParams = await params;
  const prospectId = routeParams.id;
  const supabase = await createClient();

  // Fetch prospect with tagged_icp
  const { data: prospect }: { data: Prospect | null } = await supabase
    .from("prospects")
    .select(
      `
      id,
      name,
      status,
      tagged_icp_id,
      company,
      job_title,
      phone,
      email,
      website,
      city,
      state,
      zip_code,
      linked_in_url,
      company_jobs_board_url,
      owner:owner_id(id, full_name),
      created_at,
      tagged_icp:tagged_icp_id(id, title, tag_color)
    `,
    )
    .eq("id", prospectId)
    .single();

  if (!prospect) notFound();

  // Fetch owner
  const { data: owner } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", prospect.owner.id)
    .single();

  // Fetch ICPs for potential editing
  const { data: icps } = await supabase
    .from("intended_customer_profiles")
    .select("id, title, tag_color");

  // Fetch tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, type, description, due_date, status, created_at, lead:lead_id(id, name, company, source), deal:deal_id(id, owner_name, lead_name, lead_company),owner:owner_id(full_name)"
    )
    .eq("prospect_id", routeParams.id)
    .order("due_date", { ascending: true });

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <ProspectDetailClient
      prospect={prospect}
      owner={owner}
      icps={
        (icps as unknown as Array<
          IntendedCustomerProfile & { value: string; label: string }
        >) || []
      }
      tasks={(tasks as unknown as Task[]) || []}
      userId={user!.id}
    />
  );
}
