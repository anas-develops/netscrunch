"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Search,
  Filter,
  Briefcase,
  Tag,
  User,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { fetchDeals } from "./actions";
import { Deal, Owner } from "./types";

const PAGE_SIZE = 20;
const STAGE_OPTIONS = [
  "Prospecting",
  "Qualification",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];
const SOURCE_OPTIONS = [
  "Upwork",
  "Freelancer",
  "Recruitment",
  "B2B",
  "Referral",
];

export default function DealsClient({
  initialData,
}: {
  initialData: {
    deals: Deal[];
    count: number;
    owners: Owner[];
  };
}) {
  const [deals, setDeals] = useState({
    deals: initialData.deals,
    count: initialData.count,
  });
  const owners = initialData.owners;
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!firstLoad.current) {
      (async () => {
        setLoading(true);
        const result = await fetchDeals(
          search,
          stageFilter,
          sourceFilter,
          ownerFilter,
          PAGE_SIZE,
          currentPage
        );

        setDeals(result as unknown as { deals: Deal[]; count: number });
        setLoading(false);
      })();
    }
    firstLoad.current = false;
  }, [search, stageFilter, sourceFilter, ownerFilter, currentPage]);

  const totalPages = Math.ceil(deals.count / PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, stageFilter, sourceFilter, ownerFilter]);

  const StageBadge = ({ stage }: { stage: string }) => {
    const colorMap: Record<string, string> = {
      Prospecting: "bg-gray-100 text-gray-800",
      Qualification: "bg-blue-100 text-blue-800",
      Proposal: "bg-purple-100 text-purple-800",
      Negotiation: "bg-orange-100 text-orange-800",
      Won: "bg-green-100 text-green-800",
      Lost: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`text-xs px-2 py-1 rounded-full font-medium ${
          colorMap[stage] || "bg-gray-100"
        }`}
      >
        {stage}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Deals</h1>
        <button
          onClick={() => router.push("/deals/new")}
          className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 cursor-pointer rounded text-sm"
        >
          <Plus size={14} />
          New Deal
        </button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search deal or lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded"
          />
        </div>

        {/* Stage */}
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Stages</option>
          {STAGE_OPTIONS.map((s) => (
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
          stageFilter !== "all" ||
          sourceFilter !== "all" ||
          ownerFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setStageFilter("all");
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
        Showing <strong>{deals.deals.length}</strong> of{" "}
        <strong>{deals.count}</strong> deals
      </div>

      {/* Table */}
      {deals.deals.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No deals found. Try adjusting your filters.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Deal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Close Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-700 divide-y divide-gray-200">
              {deals.deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Briefcase className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="font-medium">{deal.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {deal.lead_id && deal.lead_name ? (
                      <Link
                        href={`/leads/${deal.lead_id}`}
                        className="text-blue-500 hover:underline"
                      >
                        {deal.lead_name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">Standalone</span>
                    )}
                    {deal.lead_company && (
                      <div className="text-sm text-gray-400">
                        {deal.lead_company}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StageBadge stage={deal.stage} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {deal.value ? `$${deal.value.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {deal.owner_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {deal.close_date || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="text-blue-500 hover:text-blue-200"
                    >
                      View
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
