"use server";

import { createClient } from "@/lib/supabase/server";
import { IntendedCustomerProfile, Owner, Prospect } from "./types";
import { format } from "date-fns";

export async function fetchProspects(
  search?: string | null,
  ownerFilter?: Array<string> | null,
  icpFilter?: Array<string> | null,
  pageSize: number = 20,
  currentPage: number = 1,
  companyFilter?: string | null,
  cityFilter?: string | null,
  stateFilter?: string | null,
  jobTitleFilter?: string | null,
  zipCodeFilter?: string | null,
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
      `,
    { count: "exact" },
  );

  if (!!search) {
    prospectsDataQuery = prospectsDataQuery.or(
      `name.ilike.%${search}%,company.ilike.%${search}%,job_title.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`,
    );
  }

  if (!!ownerFilter && ownerFilter.length > 0) {
    prospectsDataQuery = prospectsDataQuery.in("owner_id", ownerFilter);
  }

  if (!!icpFilter && icpFilter.length > 0) {
    prospectsDataQuery = prospectsDataQuery.in("tagged_icp_id", icpFilter);
  }

  if (!!companyFilter && companyFilter.trim() !== "") {
    const companies = companyFilter
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (companies.length > 0) {
      prospectsDataQuery = prospectsDataQuery.or(
        companies.map((c) => `company.ilike.%${c}%`).join(","),
      );
    }
  }

  if (!!cityFilter && cityFilter.trim() !== "") {
    const cities = cityFilter
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (cities.length > 0) {
      prospectsDataQuery = prospectsDataQuery.or(
        cities.map((c) => `city.ilike.%${c}%`).join(","),
      );
    }
  }

  if (!!stateFilter && stateFilter.trim() !== "") {
    const states = stateFilter
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (states.length > 0) {
      prospectsDataQuery = prospectsDataQuery.or(
        states.map((s) => `state.ilike.%${s}%`).join(","),
      );
    }
  }

  if (!!jobTitleFilter && jobTitleFilter.trim() !== "") {
    const jobTitles = jobTitleFilter
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (jobTitles.length > 0) {
      prospectsDataQuery = prospectsDataQuery.or(
        jobTitles.map((j) => `job_title.ilike.%${j}%`).join(","),
      );
    }
  }

  if (!!zipCodeFilter && zipCodeFilter.trim() !== "") {
    const zipCodes = zipCodeFilter
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (zipCodes.length > 0) {
      prospectsDataQuery = prospectsDataQuery.or(
        zipCodes.map((z) => `zip_code.ilike.%${z}%`).join(","),
      );
    }
  }

  const { data: allRecords, count: totalCount } = await prospectsDataQuery;

  const prospectsDataQueryPaginated = prospectsDataQuery
    .order("created_at", { ascending: false })
    .range(
      pageSize * (currentPage - 1),
      pageSize * (currentPage - 1) + pageSize - 1,
    );

  let { data: prospectsData, error } = await prospectsDataQueryPaginated;

  if (error) {
    console.error("Error fetching prospects:", error);
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
    count: totalCount || allRecords?.length || 0,
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
