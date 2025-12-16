import LeadsClient from "./leadsClient";
import { Metadata } from "next";
import { fetchData, fetchLeads } from "./actions";

export const metadata: Metadata = {
  title: "Lead | NetScrunch by Netpace",
};

export default async function LeadsPage() {
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
