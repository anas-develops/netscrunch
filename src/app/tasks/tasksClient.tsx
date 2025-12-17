"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Task } from "./types";
import { useDebounce } from "@/hooks/useDebounce";

type TeamMember = {
  id: string;
  full_name: string;
};

type InitialData = {
  tasks: Task[];
  count: number;
  teamMembers: TeamMember[];
  currentUser: { id: string; name: string };
};

type Filters = {
  view: "my" | "team";
  search: string;
  type: string;
  owner: string;
};

const TASK_TYPES = ["Call", "Email", "Message", "Proposal", "Follow-up"];

export default function TasksClient({
  initialData,
  filters,
  role,
}: {
  initialData: InitialData;
  filters: Filters;
  role: string;
}) {
  const [tasks, setTasks] = useState(initialData.tasks);
  const [count, setCount] = useState(initialData.count);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(
    filters.search || searchParams.get("search")
  );
  const [typeFilter, setTypeFilter] = useState<string | null>(
    filters.type || searchParams.get("type")
  );
  const [ownerFilter, setOwnerFilter] = useState<string | null>(
    filters.owner || searchParams.get("owner")
  );
  const [view, setView] = useState<"my" | "team">(
    filters.view || searchParams.get("view")
  );
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const firstLoad = useRef(true);

  const debouncedSearch = useDebounce(search, 300);

  // Update URL on filter change
  useEffect(() => {
    if (!firstLoad.current) {
      setLoading(true);
      const params = new URLSearchParams();
      if (view === "team" && role === "manager") params.set("view", "team");
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (typeFilter !== "all") params.set("type", typeFilter || "");
      if (view === "team" && ownerFilter !== "all")
        params.set("owner", ownerFilter || "");
      if (currentPage > 1) params.set("page", currentPage.toString());
      location.href = `/tasks?${params.toString()}`;
    }
    firstLoad.current = false;
  }, [view, debouncedSearch, typeFilter, ownerFilter, currentPage]);

  // Refetch on URL change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const url = new URL(window.location.href);
      const res = await fetch(`/api/tasks?${url.searchParams}`);
      const data = await res.json();
      setTasks(data.tasks);
      setCount(data.count);
      setLoading(false);
    };
    // For simplicity, we'll skip this and rely on full page reload
    // In production, you'd use a Server Action call like in Leads
  }, []);

  const totalPages = Math.ceil(count / 20);

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "Call":
        return <Phone className="w-4 h-4" />;
      case "Email":
        return <Mail className="w-4 h-4" />;
      case "Message":
        return <MessageSquare className="w-4 h-4" />;
      case "Proposal":
        return <FileText className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getUrgencyClass = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "bg-rose-900 border-l-4 border-red-500"; // Overdue
    if (diffDays === 0) return "bg-orange-900 border-l-4 border-orange-500"; // Today
    return "bg-gray-700 border-l-4 border-blue-500"; // Upcoming
  };

  const getUrgencyIcon = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    if (due < today) return <AlertCircle className="w-4 h-4 text-red-300" />;
    if (due.toDateString() === today.toDateString())
      return <AlertCircle className="w-4 h-4 text-orange-300" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
      </div>

      {/* View Toggle */}
      <div className="flex mb-6">
        <button
          onClick={() => setView("my")}
          className={`px-4 py-2 text-sm font-medium rounded-l cursor-pointer ${
            view === "my"
              ? "bg-gray-900 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          My Tasks
        </button>
        {role === "manager" && (
          <button
            onClick={() => setView("team")}
            className={`px-4 py-2 text-sm font-medium rounded-r cursor-pointer ${
              view === "team"
                ? "bg-gray-900 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Team Tasks
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search task, lead, or deal..."
          value={search || ""}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full px-3 py-2 border rounded"
        />

        <select
          value={typeFilter || ""}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Types</option>
          {TASK_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        {view === "team" && role === "manager" && (
          <select
            value={ownerFilter || ""}
            onChange={(e) => {
              setOwnerFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Team Members</option>
            {initialData.teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No incomplete tasks found.
        </div>
      ) : !loading ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Related To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Due Date
                </th>
                {view === "team" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                    Owner
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-700 divide-y divide-gray-200">
              {tasks.map((task) => (
                <tr key={task.id} className={getUrgencyClass(task.due_date!)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getUrgencyIcon(task.due_date!)}
                      <span className="ml-2 mr-2">
                        {getTaskIcon(task.type!)}
                      </span>
                      <span>{task.description || task.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.lead?.name || task.deal?.lead_name || "Standalone"}

                    <span className="font-bold">
                      {task.lead?.company
                        ? ` @ ${task.lead.company}`
                        : task.deal?.lead_company
                        ? ` @ ${task.deal.lead_company}`
                        : ""}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(task.due_date!).toLocaleDateString()}
                  </td>
                  {view === "team" && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {task.owner?.full_name}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    {task.lead && (
                      <Link
                        href={`/leads/${task.lead.name}`}
                        className="text-shadow-lime-600 hover:underline mr-3"
                      >
                        View Lead
                      </Link>
                    )}
                    {task.deal && (
                      <Link
                        href={`/deals/${task.deal.id}`}
                        className="text-sky-400 hover:underline"
                      >
                        View Deal
                      </Link>
                    )}
                    <Link
                      href={`/tasks/${task.id}`}
                      className="text-gray-200 hover:underline"
                    >
                      View Task
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center p-6">
          <div className="animate-spin border-t-2 border-b-2 border-gray-200 h-10 w-10 rounded-full" />
          <p className="ml-4 text-xl font-semibold color-gray-200">
            Loading...
          </p>
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
