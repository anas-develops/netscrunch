"use server";

import { createClient } from "@/lib/supabase/server";
import { IntendedCustomerProfile } from "./types";
import { format } from "date-fns";

export async function fetchIcps(
  search?: string | null,
  ownerFilter?: string | null,
  pageSize: number = 20,
  currentPage: number = 1
) {
  const supabaseServer = await createClient();
  let icpDataQuery = supabaseServer
    .from("intended_customer_profiles")
    .select(
      "id, title, description, tag_color, owner:owner_id(full_name), created_at"
    );

  if (!!search) {
    icpDataQuery = icpDataQuery.or(
      `title.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  if (!!ownerFilter) {
    icpDataQuery = icpDataQuery.eq("owner_id", ownerFilter);
  }

  const { data: allRecords } = await icpDataQuery;

  const icpDataQueryPaginated = icpDataQuery
    .order("created_at", { ascending: false })
    .range(
      pageSize * (currentPage - 1),
      pageSize * (currentPage - 1) + pageSize - 1
    );

  let { data: icpData } = await icpDataQueryPaginated;

  if (!!icpData) {
    icpData = icpData?.map((lead) => ({
      ...lead,
      created_at: format(new Date(lead.created_at), "MM/dd/yyyy"),
    }));
  }

  return {
    icps: (icpData as unknown as IntendedCustomerProfile[]) || [],
    count: allRecords?.length || 0,
  };
}

export async function fetchData(): Promise<
  { id: any; full_name: any }[] | null
> {
  const supabaseServer = await createClient();
  const { data: ownerData } = await supabaseServer
    .from("profiles")
    .select("id, full_name");

  return ownerData;
}
