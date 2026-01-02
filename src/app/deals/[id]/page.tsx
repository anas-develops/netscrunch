import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Deal, Task } from "../types";
import DealDetailClient from "./dealDetailClient";

export default async function ViewDealPage({
  params,
}: {
  params: { id: string };
}) {
  const routeParams = await params;
  const dealId = routeParams.id;
  const supabase = await createClient();

  // Fetch deal with linked lead + owner
  const { data: deal }: { data: Deal | null } = await supabase
    .from("deals")
    .select(
      `
      id,
      name,
      value,
      close_date,
      stage,
      notes,
      lead_id,
      owner_user_id:owner_id,
      owner_id(full_name),
      lead:leads!lead_id (id, name, company, source)
    `
    )
    .eq("id", dealId)
    .single();

  if (!deal) notFound();

  console.log("deal", deal);

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, type, description, due_date, status, created_at, lead:lead_id(id, name, company, source), deal:deal_id(id, owner_name, lead_name, lead_company),owner:owner_id(full_name)"
    )
    .eq("deal_id", routeParams.id)
    .order("due_date", { ascending: true });

  return (
    <DealDetailClient
      deal={deal}
      tasks={(tasks as unknown as Task[]) || []}
      userId={deal.owner_user_id}
    />
  );
}
