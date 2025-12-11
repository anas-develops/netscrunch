import { redirect } from "next/navigation";
import LeadsClient from "./leadsClient"; // Your existing client component
import { Lead } from "./types";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { fetchData, fetchLeads } from "./actions";

export const metadata: Metadata = {
  title: "Leads",
};

export default async function LeadsPage() {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    console.log("User", user);
    redirect("/login");
  }

  const ownerData = await fetchData();
  const leads = await fetchLeads();

  return (
    <LeadsClient
      fetchData={fetchData}
      fetchLeads={fetchLeads}
      initialData={{
        count: leads.count,
        leads: leads.leads,
        owners: ownerData,
      }}
    />
  );
}
