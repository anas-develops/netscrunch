"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, Filter, User, Tag, Plus } from "lucide-react";
import { IntendedCustomerProfile, Owner } from "./types";
import Link from "next/link";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["Applied", "Conversation", "Interview", "Won", "Lost"];
const SOURCE_OPTIONS = [
  "Upwork",
  "Freelancer",
  "Recruitment",
  "B2B",
  "Referral",
];

export default function IntendedCustomerProfilesClient({
  fetchData,
  fetchIcps,
  initialData,
}: {
  fetchData: () => Promise<
    | {
        id: any;
        full_name: any;
      }[]
    | null
  >;
  fetchIcps: (
    search?: string | null,
    statusFilter?: string | null,
    sourceFilter?: string | null,
    ownerFilter?: string | null,
    pageSize?: number,
    currentPage?: number
  ) => Promise<{
    icps: IntendedCustomerProfile[];
    count: number;
  }>;
  initialData: {
    icps: IntendedCustomerProfile[];
    owners: Owner[] | null;
    count: number;
  };
}) {
  const [icps, setIcps] = useState<{
    icps: IntendedCustomerProfile[];
    count: number;
  }>({
    icps: initialData.icps || [],
    count: initialData.count || 0,
  });
  const owners: Owner[] = initialData.owners || [];
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const firstLoad = useRef(true);

  useEffect(() => {
    if (!firstLoad.current) {
      (async function () {
        const { icps, count } = await fetchIcps(
          search,
          statusFilter,
          sourceFilter,
          ownerFilter,
          PAGE_SIZE,
          currentPage
        );

        setIcps({ icps, count });
      })();
    }

    firstLoad.current = false;
  }, [search, statusFilter, sourceFilter, ownerFilter, currentPage]);

  const totalPages = Math.ceil(icps.count / PAGE_SIZE);

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
      Applied: "bg-blue-100 text-blue-800",
      Conversation: "bg-orange-100 text-orange-800",
      Interview: "bg-purple-100 text-purple-800",
      Won: "bg-green-100 text-green-800",
      Lost: "bg-red-100 text-red-800",
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
        <h1 className="text-2xl font-bold">Intended Customer Profiles</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/intended-customer-profiles/import")}
            className="flex items-center gap-1 bg-green-800 text-white px-3 py-2 rounded text-sm"
          >
            <Download size={14} />
            Import ICP
          </button>
          <button
            onClick={() => router.push("/intended-customer-profiles/new")}
            className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded cursor-pointer text-sm"
          >
            <Plus size={14} />
            New ICP
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
        Showing <strong>{icps.icps?.length}</strong> of{" "}
        <strong>{icps.count}</strong> profiles
      </div>

      {/* Table */}
      {icps.icps?.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No ICPs found. Try adjusting your filters.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Description
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
              {icps.icps?.map((icp) => (
                <tr key={icp.id} className="hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className="flex items-center rounded-md justify-center"
                      style={{ backgroundColor: icp.tag_color }}
                    >
                      <Tag className="h-4 w-4 mr-1 text-gray-500" />
                      <span className="font-medium">{icp.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {icp.description.slice(0, 20) + "..."}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {icp.owner.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {icp.created_at}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/intended-customer-profiles/${icp.id}/edit`}
                      className="text-blue-500 font-bold cursor-pointer hover:text-blue-200"
                    >
                      Edit
                    </Link>
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
