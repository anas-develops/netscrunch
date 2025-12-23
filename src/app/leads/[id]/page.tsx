import { redirect } from "next/navigation";
import { LeadDetailClient } from "./leadDetailClient";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Task } from "../types";

export default async function ViewLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const paramValues = await params;
  const supabaseServer = await createClient();

  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  // 2. Fetch lead
  const { data: lead, error: leadErr } = await supabaseServer
    .from("leads")
    .select("*")
    .eq("id", paramValues.id)
    .single();

  if (leadErr || !lead) notFound();

  // 3. Fetch owner
  const { data: owner } = await supabaseServer
    .from("profiles")
    .select("id, full_name")
    .eq("id", lead.owner_id)
    .single();

  // 4. Fetch tasks
  const { data: tasks } = await supabaseServer
    .from("tasks")
    .select(
      "id, type, description, due_date, status, created_at, lead:lead_id(id, name, company, source), deal:deal_id(id, owner_name, lead_name, lead_company),owner:owner_id(full_name)"
    )
    .eq("lead_id", paramValues.id)
    .order("due_date", { ascending: true });

  return (
    <LeadDetailClient
      lead={lead}
      owner={owner}
      tasks={(tasks as unknown as Task[]) || []}
      userId={user!.id}
    />
  );
}
