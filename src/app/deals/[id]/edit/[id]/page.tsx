import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditDealForm } from "../editDealForm";

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

  // Fetch deal with linked lead + owner
  const { data: deal } = await supabase
    .from("deals")
    .select(
      `
      id,
      name,
      value,
      close_date,
      stage,
      notes,
      owner_id,
      lead_id,
      leads!inner (id, name, company, department)
    `
    )
    .eq("id", dealId)
    .single();

  if (!deal) notFound();

  return <EditDealForm initialDeal={deal} userId={user.id} />;
}
