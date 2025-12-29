"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Activity = {
  id: string;
  timestamp: string;
  user: { full_name: string };
  action_type: string;
  metadata: any;
  description: string | null;
};

export function ActivityTimeline({
  entityType,
  entityId,
}: {
  entityType: "lead" | "deal";
  entityId: string;
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [entityId]);

  const fetchActivities = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // 1. Determine entity type and get linked task IDs
      let taskIds: string[] = [];

      if (entityType === "lead") {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id")
          .eq("lead_id", entityId);
        taskIds = tasks?.map((t) => t.id) || [];
      } else if (entityType === "deal") {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id")
          .eq("deal_id", entityId);
        taskIds = tasks?.map((t) => t.id) || [];
      }

      // 2. Build OR filter: entity activities + task activities
      let orFilter = `and(entity_type.eq.${entityType},entity_id.eq.${entityId})`;
      if (taskIds.length > 0) {
        orFilter += `,and(entity_type.eq.task,entity_id.in.(${taskIds.join(
          ","
        )}))`;
      }

      // 3. Fetch all activities in one query
      const { data } = await supabase
        .from("activity_log")
        .select(
          `
        id,
        timestamp,
        action_type,
        description,
        metadata,
        user:profiles!user_id (full_name),
        entity_type,
        entity_id
      `
        )
        .or(orFilter)
        .order("timestamp", { ascending: false });

      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionText = (activity: Activity) => {
    const { action_type, metadata } = activity;
    switch (action_type) {
      case "lead_created":
        return "Lead created";
      case "lead_status_changed":
        return `Status changed from ${metadata.old_status} to ${metadata.new_status}`;
      case "deal_stage_changed":
        return `Stage changed from ${metadata.old_stage} to ${metadata.new_stage}`;
      case "task_completed":
        return "Task completed";
      case "manual_activity":
        return `${metadata.activity_type}: ${metadata.description}`;
      default:
        return action_type.replace(/_/g, " ");
    }
  };

  const getActivityContent = (activity: Activity) => {
    // For manual activities, show description
    if (activity.action_type === "manual_activity" && activity.description) {
      return activity.description;
    }

    // For automatic activities, use metadata (as before)
    const { action_type, metadata } = activity;
    switch (action_type) {
      case "lead_status_changed":
        return `Status changed from ${metadata.old_status} to ${metadata.new_status}`;
      // ... other cases
      default:
        return action_type.replace(/_/g, " ");
    }
  };

  if (loading) return <div>Loading activities...</div>;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Activity Timeline</h3>
      {activities.length === 0 ? (
        <p className="text-gray-500">No activities yet</p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm">
                {activity.user.full_name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-medium">{activity.user.full_name}</div>
                <div className="text-sm text-gray-600">
                  {getActivityContent(activity)}
                </div>
                <div className="text-sm text-gray-600">
                  {getActionText(activity)}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
