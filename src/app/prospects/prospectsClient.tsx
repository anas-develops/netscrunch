"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Search,
  Filter,
  User,
  Tag,
  Plus,
  CheckSquare,
  Square,
  ArrowUpRight,
  RotateCcw,
} from "lucide-react";
import { Prospect, Owner, IntendedCustomerProfile } from "./types";
import Link from "next/link";
import Select from "react-select";
import { components } from "react-select";
import { fetchProspects } from "./actions";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 20;

const ALLOWED_STATUSES = [
  "Not Contacted",
  "Not Qualified",
  "Pre-Qualified",
  "Lost Lead",
  "Junk Lead",
  "Contacted",
  "Contacted in Future",
  "Attempted to Contact",
];

// Helper functions for localStorage
const getPendingUpdates = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem("pendingProspectStatusUpdates");
  return stored ? JSON.parse(stored) : {};
};

const setPendingUpdates = (updates: Record<string, string>) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("pendingProspectStatusUpdates", JSON.stringify(updates));
};

const clearPendingUpdates = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("pendingProspectStatusUpdates");
};

export default function ProspectsClient({
  initialData,
}: {
  initialData: {
    prospects: Prospect[];
    owners: Array<Owner & { value: string; label: string }> | null;
    icps: Array<
      IntendedCustomerProfile & { value: string; label: string }
    > | null;
    count: number;
  };
}) {
  const [prospects, setProspects] = useState<{
    prospects: Prospect[];
    count: number;
  }>({
    prospects: initialData.prospects || [],
    count: initialData.count || 0,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [icpFilter, setIcpFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [jobTitleFilter, setJobTitleFilter] = useState<string>("");
  const [zipCodeFilter, setZipCodeFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(
    new Set()
  );
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionStatus, setBulkActionStatus] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdatesState] = useState<
    Record<string, string>
  >({});
  const router = useRouter();

  const firstLoad = useRef(true);

  const supabaseClient = createClient();

  // Initialize pending updates from localStorage
  useEffect(() => {
    setPendingUpdatesState(getPendingUpdates());
  }, []);

  // Custom Option component to display color in the ICP dropdown
  const CustomIcpOption = (props: any) => {
    const { data } = props;
    return (
      <components.Option {...props}>
        <div className="flex items-center">
          <div
            className="w-4 h-4 rounded mr-2 border border-gray-300"
            style={{ backgroundColor: data.tag_color }}
          />
          <span className="text-black">{data.label}</span>
        </div>
      </components.Option>
    );
  };

  // Custom SingleValue component to ensure black text for owner select
  const CustomSingleValue = (props: any) => {
    return (
      <components.Option {...props}>
        <div className="flex items-center">
          <span className="text-black">{props.data.label}</span>
        </div>
      </components.Option>
    );
  };

  // Toggle selection of a single prospect
  const toggleProspectSelection = (id: string) => {
    const newSelected = new Set(selectedProspects);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProspects(newSelected);

    // Show bulk actions bar when at least one prospect is selected
    setShowBulkActions(newSelected.size > 0);
  };

  // Toggle selection of all visible prospects
  const toggleSelectAll = () => {
    if (selectedProspects.size === prospects.prospects.length) {
      // Deselect all
      setSelectedProspects(new Set());
      setShowBulkActions(false);
    } else {
      // Select all visible prospects
      const allIds = new Set(prospects.prospects.map((p) => p.id));
      setSelectedProspects(allIds);
      setShowBulkActions(true);
    }
  };

  // Handle bulk conversion to leads
  const handleBulkConvertToLeads = async () => {
    if (selectedProspects.size === 0) return;

    const prospectIds = Array.from(selectedProspects);
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
      alert("Not authenticated");
      return;
    }

    const { data, error } = await supabaseClient.functions.invoke(
      "bulk-convert-to-leads",
      {
        body: { prospectIds },
      }
    );

    console.log("data", data);

    if (error) {
      alert(error);
    }

    alert("Lead conversion queued, check back in a while on the leads page");

    return data;
  };

  const bulkUpdateProspectStatus = async (
    prospectIds: string[],
    status: string
  ) => {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session) return;

    const { data, error } = await supabaseClient.functions.invoke(
      "bulk-update-prospect-status",
      {
        body: { prospectIds, status },
      }
    );

    console.log("data", data);

    if (error) {
      // Clear pending updates for the failed prospect IDs
      const updatedPending = { ...pendingUpdates };
      prospectIds.forEach((id) => {
        if (updatedPending[id]) {
          delete updatedPending[id];
        }
      });

      setPendingUpdatesState(updatedPending);
      setPendingUpdates(updatedPending);

      // Clear localStorage if no pending updates remain
      if (Object.keys(updatedPending).length === 0) {
        clearPendingUpdates();
      } else {
        setPendingUpdates(updatedPending);
      }

      alert(error);
    }

    return data;
  };

  // Handle bulk status update
  const handleBulkUpdateStatus = async () => {
    if (selectedProspects.size === 0 || !bulkActionStatus) return;

    // Store pending updates in localStorage
    const prospectIds = Array.from(selectedProspects);
    const updates = { ...pendingUpdates };

    prospectIds.forEach((id) => {
      updates[id] = bulkActionStatus!;
    });

    setPendingUpdates(updates);
    setPendingUpdatesState(updates);

    // In a real implementation, you would call an API to update the statuses
    // For now, we'll just show an alert
    alert(
      `Updating ${selectedProspects.size} prospects to status: ${bulkActionStatus}`
    );

    // Reset selections after action
    setSelectedProspects(new Set());
    setShowBulkActions(false);
    setBulkActionStatus(null);

    bulkUpdateProspectStatus(prospectIds, bulkActionStatus);
  };

  // Refresh prospects function
  const refreshProspects = async () => {
    setLoading(true);
    try {
      const { prospects, count } = await fetchProspects(
        search,
        ownerFilter,
        icpFilter,
        PAGE_SIZE,
        currentPage
      );

      setProspects({ prospects, count });

      // Check if any pending updates match the new data and clear them
      const updatedPending = { ...pendingUpdates };
      let hasChanges = false;

      prospects.forEach((prospect) => {
        if (
          updatedPending[prospect.id] &&
          updatedPending[prospect.id] === prospect.status
        ) {
          delete updatedPending[prospect.id];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setPendingUpdatesState(updatedPending);
        setPendingUpdates(updatedPending);

        // Clear localStorage if no pending updates remain
        if (Object.keys(updatedPending).length === 0) {
          clearPendingUpdates();
        } else {
          setPendingUpdates(updatedPending);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!firstLoad.current) {
      (async function () {
        console.log("icpFilter", icpFilter);

        const { prospects, count } = await fetchProspects(
          search,
          ownerFilter,
          icpFilter,
          PAGE_SIZE,
          currentPage,
          companyFilter,
          cityFilter,
          stateFilter,
          jobTitleFilter,
          zipCodeFilter
        );

        setProspects({ prospects, count });

        // Check if any pending updates match the new data and clear them
        const updatedPending = { ...pendingUpdates };
        let hasChanges = false;

        prospects.forEach((prospect) => {
          if (
            updatedPending[prospect.id] &&
            updatedPending[prospect.id] === prospect.status
          ) {
            delete updatedPending[prospect.id];
            hasChanges = true;
          }
        });

        if (hasChanges) {
          setPendingUpdatesState(updatedPending);
          setPendingUpdates(updatedPending);

          // Clear localStorage if no pending updates remain
          if (Object.keys(updatedPending).length === 0) {
            clearPendingUpdates();
          } else {
            setPendingUpdates(updatedPending);
          }
        }
      })();
    }

    firstLoad.current = false;
  }, [search, ownerFilter, icpFilter, currentPage, companyFilter, cityFilter, stateFilter, jobTitleFilter, zipCodeFilter]);

  const totalPages = Math.ceil(prospects.count / PAGE_SIZE);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // Enhanced StatusBadge that shows pending status
  const StatusBadge = ({
    status,
    prospectId,
  }: {
    status: string;
    prospectId: string;
  }) => {
    const pendingStatus = pendingUpdates[prospectId];
    const displayStatus = pendingStatus
      ? `${status} → ${pendingStatus} (pending)`
      : status;

    const colorMap: Record<string, string> = {
      "Not Contacted": "bg-gray-100 text-gray-800",
      "Not Qualified": "bg-yellow-100 text-yellow-800",
      "Pre-Qualified": "bg-green-100 text-green-800",
      "Lost Lead": "bg-red-100 text-red-800",
      "Junk Lead": "bg-red-100 text-red-800",
      Contacted: "bg-blue-100 text-blue-800",
      "Contacted in Future": "bg-purple-100 text-purple-800",
      "Attempted to Contact": "bg-orange-100 text-orange-800",
    };

    // Determine the color based on the original status or pending status
    let bgColor = colorMap[status] || "bg-gray-100";
    if (pendingStatus) {
      bgColor = "bg-yellow-100 text-yellow-800"; // Yellow for pending changes
    }

    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${bgColor}`}>
        {displayStatus}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Prospects</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/prospects/import")}
            className="flex items-center gap-1 bg-green-800 text-white px-3 py-2 rounded text-sm"
          >
            <Download size={14} />
            Import Prospects
          </button>
          <button
            onClick={() => router.push("/prospects/new")}
            className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded cursor-pointer text-sm"
          >
            <Plus size={14} />
            New Prospect
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded"
          />
        </div>

        {/* Owner */}
        <Select
          options={[
            { value: "all", label: "All Owners" },
            ...(initialData.owners || []),
          ]}
          value={
            ownerFilter === "all"
              ? { value: "all", label: "All Owners" }
              : (initialData.owners || []).find(
                  (owner) => owner.value === ownerFilter
                )
          }
          onChange={(selected) => setOwnerFilter(selected?.value || "all")}
          placeholder="Select Owner"
          components={{
            Option: CustomSingleValue,
          }}
        />

        {/* ICP */}
        <Select
          options={[
            { value: "all", label: "All ICP Tags" },
            ...(initialData.icps || []),
          ]}
          value={
            icpFilter === "all"
              ? { value: "all", label: "All ICP Tags" }
              : (initialData.icps || []).find((icp) => icp.value === icpFilter)
          }
          onChange={(selected) => {
            setIcpFilter(selected?.value || "all");
          }}
          placeholder="Select ICP Tag"
          components={{
            Option: CustomIcpOption,
          }}
        />

        {/* Refresh Button */}
        <button
          onClick={refreshProspects}
          disabled={loading}
          className="flex items-center justify-center gap-1 bg-gray-200 text-gray-800 px-3 py-2 rounded text-sm hover:bg-gray-300 disabled:opacity-50"
        >
          <RotateCcw size={14} />
          Refresh
        </button>

        {/* Clear Filters */}
        {(search || ownerFilter !== "all" || icpFilter !== "all" || companyFilter || cityFilter || stateFilter || jobTitleFilter || zipCodeFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setOwnerFilter("all");
              setIcpFilter("all");
              setCompanyFilter("");
              setCityFilter("");
              setStateFilter("");
              setJobTitleFilter("");
              setZipCodeFilter("");
            }}
            className="text-sm text-red-600 hover:underline self-end"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Additional Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Company */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Company (comma-separated)
          </label>
          <input
            type="text"
            placeholder="e.g. Acme, Tech Corp"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>

        {/* Job Title */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Job Title (comma-separated)
          </label>
          <input
            type="text"
            placeholder="e.g. CEO, Manager"
            value={jobTitleFilter}
            onChange={(e) => setJobTitleFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>

        {/* City */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            City (comma-separated)
          </label>
          <input
            type="text"
            placeholder="e.g. New York, LA"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>

        {/* State */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            State (comma-separated)
          </label>
          <input
            type="text"
            placeholder="e.g. CA, NY"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>

        {/* Zip Code */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Zip Code (comma-separated)
          </label>
          <input
            type="text"
            placeholder="e.g. 10001, 90210"
            value={zipCodeFilter}
            onChange={(e) => setZipCodeFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing <strong>{prospects.prospects?.length}</strong> of{" "}
        <strong>{prospects.count}</strong> profiles
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="flex items-center justify-between p-3 bg-blue-950 border border-blue-300 rounded-t-lg mb-0">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-white">
              {selectedProspects.size} selected
            </span>
            <button
              onClick={handleBulkConvertToLeads}
              className="flex items-center gap-1 text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
            >
              <ArrowUpRight size={14} />
              Convert to Leads
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                Update Status:
              </span>
              <select
                value={bulkActionStatus || ""}
                onChange={(e) => setBulkActionStatus(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">Select Status</option>
                {ALLOWED_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkUpdateStatus}
                disabled={!bulkActionStatus}
                className={`px-3 py-1.5 rounded text-sm ${
                  bulkActionStatus
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Apply
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedProspects(new Set());
              setShowBulkActions(false);
            }}
            className="text-sm text-blue-800 hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      {prospects.prospects?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No prospects found. Try adjusting your filters.
        </div>
      ) : (
        <div className="overflow-x-auto max-w-[75vw]">
          <div
            className={`overflow-x-auto bg-white rounded-lg border ${
              showBulkActions ? "rounded-t-none" : ""
            }`}
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedProspects.size === prospects.prospects.length &&
                        prospects.prospects.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    ICP Tag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Website
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Zip Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    LinkedIn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Job Board
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-700 divide-y divide-gray-200">
                {prospects.prospects?.map((prospect) => (
                  <tr
                    key={prospect.id}
                    className={`hover:bg-gray-800 ${
                      selectedProspects.has(prospect.id) ? "bg-gray-600" : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProspects.has(prospect.id)}
                        onChange={() => toggleProspectSelection(prospect.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium">{prospect.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className="flex items-center rounded-md justify-center"
                        style={{
                          backgroundColor: prospect.tagged_icp.tag_color,
                        }}
                      >
                        <Tag className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="font-medium">
                          {prospect.tagged_icp.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge
                        status={prospect.status}
                        prospectId={prospect.id}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {prospect.owner.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {prospect.company || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {prospect.job_title || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {prospect.phone || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {prospect.email || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {prospect.website || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {prospect.city || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {prospect.state || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {prospect.zip_code || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {prospect.linked_in_url || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {prospect.company_jobs_board_url ? (
                        <Link
                          href={prospect.company_jobs_board_url}
                          className="text-blue-500 font-bold cursor-pointer hover:text-blue-200"
                          target="_blank"
                        >
                          Visit
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {prospect.created_at}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-between items-center gap-2">
                        <Link
                          href={`/prospects/${prospect.id}`}
                          className="text-blue-500 font-bold cursor-pointer hover:text-blue-200"
                        >
                          View
                        </Link>
                        <Link
                          href={`/prospects/${prospect.id}/edit`}
                          className="text-blue-500 font-bold cursor-pointer hover:text-blue-200"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/leads/new?prospect_id=${prospect.id}`}
                          className="text-blue-500 font-bold cursor-pointer hover:text-blue-200"
                        >
                          Convert to Lead
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
