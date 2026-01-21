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
} from "lucide-react";
import { Lead, Owner } from "./types";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  "Warmed-Up",
  "Negotiating",
  "Service Initiated",
  "Service Declined",
];
const SOURCE_OPTIONS = [
  "Upwork",
  "Freelancer",
  "Recruitment",
  "B2B",
  "Referral",
];

export default function LeadsClient({
  fetchData,
  fetchLeads,
  initialData,
}: {
  fetchData: () => Promise<
    | {
        id: any;
        full_name: any;
      }[]
    | null
  >;
  fetchLeads: (
    search?: string | null,
    statusFilter?: string | null,
    sourceFilter?: string | null,
    ownerFilter?: string | null,
    pageSize?: number,
    currentPage?: number
  ) => Promise<{
    leads: Lead[];
    count: number;
  }>;
  initialData: { leads: Lead[]; owners: Owner[] | null; count: number };
}) {
  const [leads, setLeads] = useState<{ leads: Lead[]; count: number }>({
    leads: initialData.leads || [],
    count: initialData.count || 0,
  });
  const owners: Owner[] = initialData.owners || [];
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionStatus, setBulkActionStatus] = useState<string | null>(null);
  const router = useRouter();

  const firstLoad = useRef(true);

  // Toggle selection of a single lead
  const toggleLeadSelection = (id: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLeads(newSelected);

    // Show bulk actions bar when at least one lead is selected
    setShowBulkActions(newSelected.size > 0);
  };

  // Toggle selection of all visible leads
  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.leads.length) {
      // Deselect all
      setSelectedLeads(new Set());
      setShowBulkActions(false);
    } else {
      // Select all visible leads
      const allIds = new Set(leads.leads.map((l) => l.id));
      setSelectedLeads(allIds);
      setShowBulkActions(true);
    }
  };

  // Handle bulk status update
  const handleBulkUpdateStatus = async () => {
    if (selectedLeads.size === 0 || !bulkActionStatus) return;

    // In a real implementation, you would call an API to update the statuses
    // For now, we'll just show an alert
    alert(
      `Updating ${selectedLeads.size} leads to status: ${bulkActionStatus}`
    );

    // Reset selections after action
    setSelectedLeads(new Set());
    setShowBulkActions(false);
    setBulkActionStatus(null);

    bulkUpdateLeadStatus(Array.from(selectedLeads), bulkActionStatus);
  };

  const bulkUpdateLeadStatus = async (leadIds: string[], status: string) => {
    const supabaseClient = createClient();
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data, error } = await supabaseClient.functions.invoke(
      "bulk-update-lead-status",
      {
        body: { leadIds, status },
      }
    );

    console.log("data", data);

    if (error) {
      alert(error);
    }

    return data;
  };

  useEffect(() => {
    if (!firstLoad.current) {
      (async function () {
        const { leads, count } = await fetchLeads(
          search,
          statusFilter,
          sourceFilter,
          ownerFilter,
          PAGE_SIZE,
          currentPage
        );

        setLeads({ leads, count });
      })();
    }

    firstLoad.current = false;
  }, [search, statusFilter, sourceFilter, ownerFilter, currentPage]);

  const totalPages = Math.ceil(leads.count / PAGE_SIZE);

  // --- Reset to page 1 when filters change ---
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sourceFilter, ownerFilter]);

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

  const StatusBadge = ({ status }: { status: string }) => {
    const colorMap: Record<string, string> = {
      "Warmed-Up": "bg-blue-100 text-blue-800",
      Negotiating: "bg-orange-100 text-orange-800",
      Interview: "bg-purple-100 text-purple-800",
      "Service Initiated": "bg-green-100 text-green-800",
      "Service Lost": "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`text-xs px-2 py-1 rounded-full font-medium ${
          colorMap[status] || "bg-gray-100"
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/leads/import")}
            className="flex items-center gap-1 bg-green-800 text-white px-3 py-2 rounded text-sm"
          >
            <Download size={14} />
            Import Leads
          </button>
          <button
            onClick={() => router.push("/leads/new")}
            className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded cursor-pointer text-sm"
          >
            <Plus size={14} />
            New Lead
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

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Source */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Sources</option>
          {SOURCE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Owner */}
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Owners</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.full_name}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {(search ||
          statusFilter !== "all" ||
          sourceFilter !== "all" ||
          ownerFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setSourceFilter("all");
              setOwnerFilter("all");
            }}
            className="text-sm text-red-600 hover:underline self-end"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing <strong>{leads.leads?.length}</strong> of{" "}
        <strong>{leads.count}</strong> leads
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="flex items-center justify-between p-3 bg-blue-950 border border-blue-300 rounded-t-lg mb-0">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-white">
              {selectedLeads.size} selected
            </span>
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
                {STATUS_OPTIONS.map((status) => (
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
              setSelectedLeads(new Set());
              setShowBulkActions(false);
            }}
            className="text-sm text-blue-800 hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      {leads.leads?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No leads found. Try adjusting your filters.
        </div>
      ) : (
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
                      selectedLeads.size === leads.leads.length &&
                      leads.leads.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Owner
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
              {leads.leads?.map((lead) => (
                <tr
                  key={lead.id}
                  className={`hover:bg-gray-800 ${
                    selectedLeads.has(lead.id) ? "bg-gray-600" : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => toggleLeadSelection(lead.id)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="font-medium">{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {lead.company || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center">
                      <Tag className="h-4 w-4 mr-1 text-gray-500" />
                      {lead.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {lead.owner_id.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {lead.created_at}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-between">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-blue-500 font-bold cursor-pointer hover:text-blue-200"
                      >
                        View
                      </Link>
                      {!!lead.prospect_id && (
                        <Link
                          href={`/prospects/${lead.prospect_id}`}
                          className="text-blue-500 font-bold cursor-pointer hover:text-blue-200"
                        >
                          View Prospect
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
