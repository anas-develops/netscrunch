import IntendedCustomerProfilesClient from "./intendedCustomerProfilesClient";
import { Metadata } from "next";
import { fetchData, fetchIcps } from "./actions";

export const metadata: Metadata = {
  title: "Intended Customer Profiles | NetScrunch by Netpace",
};

export default async function LeadsPage() {
  const ownerData = await fetchData();
  const icps = await fetchIcps();

  return (
    <IntendedCustomerProfilesClient
      fetchData={fetchData}
      fetchIcps={fetchIcps}
      initialData={{
        count: icps.count,
        icps: icps.icps,
        owners: ownerData,
      }}
    />
  );
}
