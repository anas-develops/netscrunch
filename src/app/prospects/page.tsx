import ProspectsClient from "./prospectsClient";
import { Metadata } from "next";
import { fetchData, fetchProspects } from "./actions";

export const metadata: Metadata = {
  title: "Prospects | NetScrunch by Netpace",
};

export default async function LeadsPage() {
  const { ownerData, icpData } = await fetchData();
  const prospects = await fetchProspects();

  return (
    <ProspectsClient
      initialData={{
        count: prospects.count,
        prospects: prospects.prospects,
        owners: ownerData || [],
        icps: icpData || [],
      }}
    />
  );
}
