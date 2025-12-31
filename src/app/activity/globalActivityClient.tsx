// app/activity/GlobalActivityClient.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";

type Activity = {
  id: string;
  timestamp: string;
  action_type: string;
  description: string | null;
  entity_type: string;
  entity_id: string;
  resolved_source: string;
  user: { full_name: string };
};

type TeamMember = { id: string; full_name: string };

const ENTITY_TYPES = [
  { value: "all", label: "All Entities" },
  { value: "lead", label: "Leads" },
  { value: "deal", label: "Deals" },
  { value: "task", label: "Tasks" },
];

const SOURCES = [
  { value: "all", label: "All Sources" },
  { value: "Upwork", label: "Upwork" },
  { value: "Recruitment", label: "Recruitment" },
  { value: "B2B", label: "B2B" },
  { value: "Freelancer", label: "Freelancer" },
  { value: "Referral", label: "Referral" },
];

export function GlobalActivityClient({
  initialData,
  filters,
  currentPage,
  role,
}: {
  initialData: {
    activities: Activity[];
    count: number;
    teamMembers: TeamMember[];
  };
  filters: any;
  currentPage: number;
  role: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localFilters, setLocalFilters] = useState(filters);
  const [activities, setActivities] = useState(initialData.activities);
  const [loading, setLoading] = useState(false);

  // Update filters in URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (localFilters.userId) params.set("user", localFilters.userId);
    if (localFilters.startDate) params.set("startDate", localFilters.startDate);
    if (localFilters.endDate) params.set("endDate", localFilters.endDate);
    if (localFilters.entityType !== "all")
      params.set("entityType", localFilters.entityType);
    if (localFilters.source !== "all")
      params.set("source", localFilters.source);
    if (currentPage > 1) params.set("page", currentPage.toString());

    router.push(`/activity?${params.toString()}`);
  }, [localFilters, currentPage]);

  // Apply source filter client-side (MVP)
  useEffect(() => {
    let filtered = initialData.activities;

    if (localFilters.source && localFilters.source !== "all") {
      filtered = filtered.filter(
        (a) => a.resolved_source === localFilters.source
      );
    }

    setActivities(filtered);
  }, [initialData.activities, localFilters.source]);

  const handleFilterChange = (key: string, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (type: "start" | "end", value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [type === "start" ? "startDate" : "endDate"]: value || null,
    }));
  };

  const totalPages = Math.ceil(initialData.count / 50);

  const getActionText = (activity: Activity) => {
    if (activity.action_type === "manual_activity" && activity.description) {
      return activity.description;
    }
    return activity.action_type.replace(/_/g, " ");
  };

  const getEntityDisplay = (activity: any) => {
    const entity = activity.linkedEntity;

    console.log("entity", entity);

    if (!entity) return "Unknown Entity";

    switch (entity.type) {
      case "lead":
        return `Lead: ${entity.name} ${
          entity.company ? `(${entity.company})` : ""
        }`;
      case "deal":
        return `Deal: ${entity.name}`;
      case "task":
        const taskDesc = entity.description || entity.type;
        let context = "";
        if (entity.leads?.[0]) {
          context = ` (for Lead: ${entity.leads[0].name})`;
        } else if (entity.deals?.[0]) {
          context = ` (for Deal: ${entity.deals[0].name})`;
        }
        return `Task: ${taskDesc}${context}`;
      default:
        return "Entity";
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Global Activity Feed</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* User */}
        <select
          value={localFilters.userId || ""}
          onChange={(e) => handleFilterChange("userId", e.target.value)}
          className="border rounded p-2"
        >
          <option value="">All Users</option>
          {initialData.teamMembers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name}
            </option>
          ))}
        </select>

        {/* Entity Type */}
        <select
          value={localFilters.entityType}
          onChange={(e) => handleFilterChange("entityType", e.target.value)}
          className="border rounded p-2"
        >
          {ENTITY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        {/* Source */}
        <select
          value={localFilters.source}
          onChange={(e) => handleFilterChange("source", e.target.value)}
          className="border rounded p-2"
        >
          {SOURCES.map((source) => (
            <option key={source.value} value={source.value}>
              {source.label}
            </option>
          ))}
        </select>

        {/* Date Range */}
        <input
          type="date"
          value={localFilters.startDate || ""}
          onChange={(e) => handleDateChange("start", e.target.value)}
          className="border rounded p-2"
          placeholder="Start Date"
        />
        <input
          type="date"
          value={localFilters.endDate || ""}
          onChange={(e) => handleDateChange("end", e.target.value)}
          className="border rounded p-2"
          placeholder="End Date"
        />
      </div>

      {/* Results */}
      <div className="mb-4 text-sm text-gray-600">
        Showing <strong>{activities.length}</strong> of{" "}
        <strong>{initialData.count}</strong> activities
      </div>

      {/* Activity List */}
      {activities.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No activities found. Try adjusting your filters.
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="p-4 border rounded bg-gray-800">
              <div className="flex justify-between">
                <div>
                  <span className="font-medium">{activity.user.full_name}</span>
                  <span className="mx-2">•</span>
                  <span
                    className="text-blue-600 hover:underline cursor-pointer"
                    onClick={() => {
                      // Optional: Add navigation
                      if (activity.linkedEntity) {
                        const { type, id } = activity.linkedEntity;
                        window.open(`/${type}s/${id}`, "_blank");
                      }
                    }}
                  >
                    {getEntityDisplay(activity)}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {format(new Date(activity.timestamp), "MMM d, yyyy HH:mm")}
                </span>
              </div>
              <div className="mt-2">{getActionText(activity)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => router.push(`/activity?page=${currentPage - 1}`)}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => router.push(`/activity?page=${currentPage + 1}`)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
