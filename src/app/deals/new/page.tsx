import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DealForm } from "./dealForm";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: { leadId?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch user's profile (for department + name)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, department")
    .eq("id", user.id)
    .single();

  // Optional: Fetch lead if coming from lead detail
  let lead = null;
  const { leadId } = await searchParams;

  if (leadId) {
    const { data: leadData } = await supabase
      .from("leads")
      .select("id, name, company, owner_id, department")
      .eq("id", leadId)
      .single();
    lead = leadData;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {lead ? "Create Deal from Lead" : "Create New Deal"}
      </h1>
      <DealForm
        userId={user.id}
        userDepartment={profile?.department || "B2B"}
        lead={lead}
      />
    </div>
  );
}
