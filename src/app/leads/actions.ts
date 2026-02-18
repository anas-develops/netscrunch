"use server";

import { format } from "date-fns";
import { Lead } from "./types";
import { createClient } from "@/lib/supabase/server";

export async function fetchLeads(
  search?: string | null,
  statusFilter?: string[] | null,
  sourceFilter?: string[] | null,
  ownerFilter?: string[] | null,
  companyFilter?: string | null,
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
      "id, name, company, source, status, prospect_id, owner_id(full_name), created_at"
    );

  if (!!search) {
    leadDataQuery = leadDataQuery.or(
      `name.ilike.%${search}%,company.ilike.%${search}%`
    );
  }

  if (!!statusFilter && statusFilter.length > 0) {
    leadDataQuery = leadDataQuery.in("status", statusFilter);
  }

  if (!!sourceFilter && sourceFilter.length > 0) {
    leadDataQuery = leadDataQuery.in("source", sourceFilter);
  }

  if (!!ownerFilter && ownerFilter.length > 0) {
    leadDataQuery = leadDataQuery.in("owner_id", ownerFilter);
  }

  if (!!companyFilter && companyFilter.trim() !== "") {
    const companies = companyFilter
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (companies.length > 0) {
      leadDataQuery = leadDataQuery.or(
        companies.map((c) => `company.ilike.%${c}%`).join(",")
      );
    }
  }

  const { data: allRecords, count: totalCount } = await leadDataQuery;

  const leadDataQueryPaginated = leadDataQuery
    .order("created_at", { ascending: false })
    .range(
      pageSize * (currentPage - 1),
      pageSize * (currentPage - 1) + pageSize - 1
    );

  let { data: leadData } = await leadDataQueryPaginated;

  if (!!leadData) {
    leadData = leadData?.map((lead) => ({
      ...lead,
      created_at: format(new Date(lead.created_at), "MM/dd/yyyy"),
    }));
  }

  return {
    leads: (leadData as unknown as Lead[]) || [],
    count: totalCount || allRecords?.length || 0,
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
