"use server";

import { createClient } from "@/lib/supabase/server";
import { IntendedCustomerProfile, Owner, Prospect } from "./types";
import { format } from "date-fns";

export async function fetchProspects(
  search?: string | null,
  ownerFilter?: string | null,
  icpFilter?: string | null,
  pageSize: number = 20,
  currentPage: number = 1
) {
  const supabaseServer = await createClient();
  let prospectsDataQuery = supabaseServer.from("prospects").select(
    `
        id,
        name,
        tagged_icp_id,
        company,
        job_title,
        phone,
        email,
        website,
        city,
        state,
        zip_code,
        linked_in_url,
        company_jobs_board_url,
        owner_id,
        owner:profiles!owner_id(id, full_name),
        tagged_icp:intended_customer_profiles!tagged_icp_id(title, tag_color),
        created_at,
        status
      `
  );

  if (!!search) {
    prospectsDataQuery = prospectsDataQuery.or(
      `name.ilike.%${search}%,company.ilike.%${search}%,job_title.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`
    );
  }

  if (!!ownerFilter && ownerFilter !== "all") {
    prospectsDataQuery = prospectsDataQuery.eq("owner_id", ownerFilter);
  }

  if (!!icpFilter && icpFilter !== "all") {
    prospectsDataQuery = prospectsDataQuery.eq("tagged_icp_id", icpFilter);
  }

  const { data: allRecords } = await prospectsDataQuery;

  const prospectsDataQueryPaginated = prospectsDataQuery
    .order("created_at", { ascending: false })
    .range(
      pageSize * (currentPage - 1),
      pageSize * (currentPage - 1) + pageSize - 1
    );

  let { data: prospectsData, error } = await prospectsDataQueryPaginated;

  if (error) {
    console.error("Error fetching deals:", error);
    throw error;
  }

  if (!!prospectsData) {
    prospectsData = prospectsData?.map((prospect) => ({
      ...prospect,
      created_at: format(new Date(prospect.created_at), "MM/dd/yyyy"),
    }));
  }

  return {
    prospects: (prospectsData as unknown as Prospect[]) || [],
    count: allRecords?.length || 0,
  };
}

export async function fetchData(): Promise<{
  ownerData: Array<Owner & { value: string; label: string }>;
  icpData: Array<IntendedCustomerProfile & { value: string; label: string }>;
}> {
  const supabaseServer = await createClient();
  const { data: ownerData } = await supabaseServer
    .from("profiles")
    .select("id, full_name, value:id, label:full_name");

  const { data: icpData } = await supabaseServer
    .from("intended_customer_profiles")
    .select("id, title, value:id, label:title, tag_color");

  return { ownerData: ownerData || [], icpData: icpData || [] };
}
