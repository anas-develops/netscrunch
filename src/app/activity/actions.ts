"use server";

import { createClient } from "@/lib/supabase/server";

export async function fetchGlobalActivities(
  filters: {
    /* ... */
  },
  currentPage: number = 1,
  pageSize: number = 50
) {
  const supabase = await createClient();

  // 1. Fetch raw activities
  let query = supabase
    .from("activity_log")
    .select(
      `
        id,
        timestamp,
        action_type,
        description,
        metadata,
        entity_type,
        entity_id,
        user:profiles!user_id (id, full_name, department)
      `,
      { count: "exact" }
    )
    .order("timestamp", { ascending: false });

  // ... apply filters ...

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: activities, error, count } = await query.range(from, to);

  if (error) throw error;

  // 2. Group entity IDs by type
  const leadIds = activities
    .filter((a) => a.entity_type === "lead")
    .map((a) => a.entity_id);

  const dealIds = activities
    .filter((a) => a.entity_type === "deal")
    .map((a) => a.entity_id);

  const taskIds = activities
    .filter((a) => a.entity_type === "task")
    .map((a) => a.entity_id);

  // 3. Fetch full entities in parallel
  const [leadData, dealData, taskData] = await Promise.all([
    // Leads
    leadIds.length > 0
      ? supabase
          .from("leads")
          .select("id, name, company, source")
          .in("id", leadIds)
      : Promise.resolve({ data: [] }),

    // Deals
    dealIds.length > 0
      ? supabase
          .from("deals")
          .select("id, name, value, stage, leads!lead_id(name, company)")
          .in("id", dealIds)
      : Promise.resolve({ data: [] }),

    // Tasks + linked entities
    taskIds.length > 0
      ? supabase
          .from("tasks")
          .select(
            `
            id,
            description,
            leads!lead_id(name, company),
            deals!deal_id(name)
          `
          )
          .in("id", taskIds)
      : Promise.resolve({ data: [] }),
  ]);

  // 4. Create lookup maps
  const leadsMap = new Map(
    leadData?.data?.map((lead) => [lead.id, lead]) || []
  );

  const dealsMap = new Map(
    dealData?.data?.map((deal) => [deal.id, deal]) || []
  );

  const tasksMap = new Map(
    taskData?.data?.map((task) => [task.id, task]) || []
  );

  // 5. Enrich activities with full entities
  const enrichedActivities = activities.map((activity) => {
    let linkedEntity = null;
    let source = "Other";

    if (activity.entity_type === "lead") {
      const lead = leadsMap.get(activity.entity_id);
      if (lead) {
        linkedEntity = { type: "lead", ...lead };
        source = lead.source || "Other";
      }
    } else if (activity.entity_type === "deal") {
      const deal = dealsMap.get(activity.entity_id);
      if (deal) {
        linkedEntity = { type: "deal", ...deal };
        source = deal.leads?.[0]?.source || "Other";
      }
    } else if (activity.entity_type === "task") {
      const task = tasksMap.get(activity.entity_id);
      if (task) {
        linkedEntity = { type: "task", ...task };
        // Inherit source from linked lead/deal
        if (task.leads?.[0]) {
          source = task.leads[0].source || "Other";
        } else if (task.deals?.[0]?.leads?.[0]) {
          source = task.deals[0].leads[0].source || "Other";
        }
      }
    }

    return { ...activity, linkedEntity, resolved_source: source };
  });

  return { activities: enrichedActivities, count: count || 0 };
}

// Fetch users for filter dropdown
export async function fetchTeamMembers() {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "sales_rep");
  return members;
}
