import { redirect } from "next/navigation";
import LeadsClient from "./leadsClient"; // Your existing client component
import { Lead } from "./types";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { fetchData, fetchLeads } from "./actions";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Leads",
};

export default async function LeadsPage() {
  const ownerData = await fetchData();
  const leads = await fetchLeads();

  leads.leads = leads.leads.map((lead) => ({
    ...lead,
    created_at: format(new Date(lead.created_at), "MM/dd/yyyy"),
  }));

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
