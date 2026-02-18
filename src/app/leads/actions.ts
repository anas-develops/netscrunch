"use server";

import { format } from "date-fns";
import { Lead, IntendedCustomerProfile } from "./types";
import { createClient } from "@/lib/supabase/server";

export async function fetchLeads(
  search?: string | null,
  statusFilter?: string[] | null,
  sourceFilter?: string[] | null,
  ownerFilter?: string[] | null,
  companyFilter?: string | null,
  icpFilter?: string[] | null,
  // New Prospect Filters
  cityFilter?: string | null,
  stateFilter?: string | null,
  jobTitleFilter?: string | null,
  zipCodeFilter?: string | null,
  pageSize: number = 20,
  currentPage: number = 1,
): Promise<{
  leads: Lead[];
  count: number;
}> {
  const supabaseServer = await createClient();

  // 1. Query the VIEW instead of the 'leads' table
  let leadDataQuery = supabaseServer
    .from("leads_extended")
    .select("*", { count: "exact" }); // 2. Get count in the same request

  // --- Existing Filters ---

  if (!!search) {
    // Search across lead and prospect fields now available in the view
    leadDataQuery = leadDataQuery.or(
      `name.ilike.%${search}%,company.ilike.%${search}%,job_title.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`,
    );
  }

  if (!!statusFilter && statusFilter.length > 0) {
    leadDataQuery = leadDataQuery.in("status", statusFilter);
  }

  if (!!sourceFilter && sourceFilter.length > 0) {
    leadDataQuery = leadDataQuery.in("source", sourceFilter);
  }

  if (!!ownerFilter && ownerFilter.length > 0) {
    // Since we flattened owner_full_name, we filter on owner_id still
    leadDataQuery = leadDataQuery.in("owner_id", ownerFilter);
  }

  if (!!icpFilter && icpFilter.length > 0) {
    leadDataQuery = leadDataQuery.in("tagged_icp_id", icpFilter);
  }

  if (!!companyFilter && companyFilter.trim() !== "") {
    const companies = companyFilter
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (companies.length > 0) {
      leadDataQuery = leadDataQuery.or(
        companies.map((c) => `company.ilike.%${c}%`).join(","),
      );
    }
  }

  // --- New Prospect Filters ---

  if (!!cityFilter && cityFilter.trim() !== "") {
    const cities = cityFilter
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (cities.length > 0) {
      leadDataQuery = leadDataQuery.or(
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
      leadDataQuery = leadDataQuery.or(
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
      leadDataQuery = leadDataQuery.or(
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
      leadDataQuery = leadDataQuery.or(
        zipCodes.map((z) => `zip_code.ilike.%${z}%`).join(","),
      );
    }
  }

  // 3. Apply Ordering and Pagination
  const {
    data: leadData,
    count: totalCount,
    error,
  } = await leadDataQuery
    .order("created_at", { ascending: false })
    .range(
      pageSize * (currentPage - 1),
      pageSize * (currentPage - 1) + pageSize - 1,
    );

  if (error) {
    console.error("Error fetching leads:", error);
    throw error;
  }

  // 4. Format Data
  let formattedLeads = (leadData as unknown as Lead[]) || [];

  if (formattedLeads.length > 0) {
    formattedLeads = formattedLeads.map((lead) => ({
      ...lead,
      // The view returns 'owner_full_name', map it back to match your Lead type if needed
      // or update your Lead type to accept owner_full_name
      created_at: format(new Date(lead.created_at), "MM/dd/yyyy"),
    }));
  }

  return {
    leads: formattedLeads,
    count: totalCount || 0,
  };
}

export async function fetchData(): Promise<{
  ownerData: { id: any; full_name: any }[] | null;
  icpData: Array<IntendedCustomerProfile & { value: string; label: string }>;
}> {
  const supabaseServer = await createClient();
  const { data: ownerData } = await supabaseServer
    .from("profiles")
    .select("id, full_name");

  const { data: icpData } = await supabaseServer
    .from("intended_customer_profiles")
    .select("id, title, tag_color");

  return {
    ownerData: ownerData || [],
    icpData: (icpData || []).map((icp) => ({
      value: icp.id,
      label: icp.title,
      tag_color: icp.tag_color,
    })),
  };
}
