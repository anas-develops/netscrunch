import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditDealForm } from "./editDealForm";
import { Deal } from "../../types";

export default async function EditDealPage({
  params,
}: {
  params: { id: string };
}) {
  const routeParams = await params;
  const dealId = routeParams.id;
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
      owner_id(full_name),
      lead:leads!lead_id (id, name, company, source)
    `
    )
    .eq("id", dealId)
    .single();

  if (!deal) notFound();

  return <EditDealForm initialDeal={deal} userId={user.id} />;
}
