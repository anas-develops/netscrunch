"use server";

import { createClient } from "@/lib/supabase/server";

export async function fetchDeals(
  search?: string | null,
  stageFilter?: string | null,
  sourceFilter?: string | null,
  ownerFilter?: string | null,
  pageSize: number = 20,
  currentPage: number = 1
) {
  const supabase = await createClient();

  let query = supabase
    .from("deals")
    .select(
      `
        id,
        name,
        value,
        close_date,
        stage,
        owner_id,
        lead_id,
        owner_name,
        lead_name,
        lead_company,
        lead:leads!lead_id (id, name, company, source)
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (search) {
    const term = search.trim();
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,owner_name.ilike.%${term}%,lead_name.ilike.%${term}%,lead_company.ilike.%${term}%`
      );
    }
  }

  if (stageFilter && stageFilter !== "all") {
    query = query.eq("stage", stageFilter);
  }

  if (ownerFilter && ownerFilter !== "all") {
    query = query.eq("owner_id", ownerFilter);
  }

  if (sourceFilter && sourceFilter !== "all") {
    query = query.eq("leads.source", sourceFilter);
  }

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  // ✅ Single query with range + count
  const { data: deals, error, count } = await query.range(from, to);

  if (error) {
    console.error("Error fetching deals:", error);
    throw error;
  }

  return {
    deals: deals || [],
    count: count || 0,
  };
}
// Fetch owners for filter dropdown
export async function fetchOwners() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name");
  return data;
}
