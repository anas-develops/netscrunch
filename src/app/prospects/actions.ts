"use server";

import { createClient } from "@/lib/supabase/server";
import { Prospect } from "./types";
import { format } from "date-fns";

export async function fetchProspects(
  search?: string | null,
  icpFilter?: string | null,
  ownerFilter?: string | null,
  pageSize: number = 20,
  currentPage: number = 1
) {
  const supabaseServer = await createClient();
  let prospectsDataQuery = supabaseServer
    .from("prospects")
    .select(
      "id, title, description, tag_color, owner:owner_id(full_name), created_at"
    );

  if (!!search) {
    prospectsDataQuery = prospectsDataQuery.or(
      `title.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  if (!!ownerFilter && ownerFilter !== "all") {
    prospectsDataQuery = prospectsDataQuery.eq("owner_id", ownerFilter);
  }

  const { data: allRecords } = await prospectsDataQuery;

  const prospectsDataQueryPaginated = prospectsDataQuery
    .order("created_at", { ascending: false })
    .range(
      pageSize * (currentPage - 1),
      pageSize * (currentPage - 1) + pageSize - 1
    );

  let { data: prospectsData } = await prospectsDataQueryPaginated;

  if (!!prospectsData) {
    prospectsData = prospectsData?.map((lead) => ({
      ...lead,
      created_at: format(new Date(lead.created_at), "MM/dd/yyyy"),
    }));
  }

  return {
    prospects: (prospectsData as unknown as Prospect[]) || [],
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
