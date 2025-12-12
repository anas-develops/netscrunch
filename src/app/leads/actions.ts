"use server";

import { Lead } from "./types";
import { createClient } from "@/lib/supabase/server";

export async function fetchLeads(
  search?: string | null,
  statusFilter?: string | null,
  sourceFilter?: string | null,
  ownerFilter?: string | null,
  pageSize: number = 20,
  currentPage: number = 1
): Promise<{
  leads: Lead[];
  count: number;
}> {
  const supabaseServer = await createClient();
  let leadDataQuery = supabaseServer
    .from("leads")
    .select(
      "id, name, company, source, status, owner_id(full_name), created_at"
    );

  if (!!search) {
    leadDataQuery = leadDataQuery.or(
      `name.ilike.%${search}%,company.ilike.%${search}%`
    );
  }

  if (!!statusFilter && statusFilter !== "all") {
    leadDataQuery = leadDataQuery.eq("status", statusFilter);
  }

  if (!!sourceFilter && sourceFilter !== "all") {
    leadDataQuery = leadDataQuery.eq("source", sourceFilter);
  }

  if (!!ownerFilter && sourceFilter !== "all") {
    leadDataQuery = leadDataQuery.eq("owner_id", ownerFilter);
  }

  const { data: allRecords } = await leadDataQuery;

  const leadDataQueryPaginated = leadDataQuery
    .order("created_at", { ascending: false })
    .range(
      pageSize * (currentPage - 1),
      pageSize * (currentPage - 1) + pageSize - 1
    );

  const { data: leadData } = await leadDataQueryPaginated;

  return {
    leads: (leadData as unknown as Lead[]) || [],
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
