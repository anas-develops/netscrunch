"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, isBefore } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { HandoverModal } from "./handoverModal";
import { Task } from "../types";
import { ActivityTimeline } from "@/app/common/activityTimeline";

type Lead = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  upwork_id: string | null;
  linkedin_url: string | null;
  source: string;
  industry: string | null;
  description: string | null;
  status: string;
  owner_id: string;
  department: string | null;
};

type Owner = {
  id: string;
  full_name: string;
};

export function LeadDetailClient({
  lead,
  owner,
  tasks,
  userId,
}: {
  lead: Lead;
  owner: Owner | null;
  tasks: Task[];
  userId: string;
}) {
  const supabaseClient = createClient();
  const router = useRouter();
  const [newTask, setNewTask] = useState({
    type: "Email" as const,
    description: "",
    due_date: "",
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(lead.status);
  const [showHandoverModal, setShowHandoverModal] = useState(false);

  const statusOptions = ["Applied", "Conversation", "Interview", "Won", "Lost"];
  const taskTypes = ["Call", "Email", "Message", "Proposal", "Follow-up"];

  const handleStatusChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newStatus = e.target.value;
    const { error } = await supabaseClient
      .from("leads")
      .update({ status: newStatus })
      .eq("id", lead.id);
    if (!error) {
      setCurrentStatus(newStatus);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTask(true);

    const { error } = await supabaseClient.from("tasks").insert({
      type: newTask.type,
      description: newTask.description || null,
      due_date: newTask.due_date,
      status: "pending",
      lead_id: lead.id,
      owner_id: userId,
    });

    if (!error) {
      setNewTask({ type: "Email", description: "", due_date: "" });
      // Optional: optimistic update or refetch
    }
    setCreatingTask(false);
  };

  const handleReassign = async () => {
    const newOwnerId = prompt("Enter new owner user ID (from Supabase Auth):");
    if (!newOwnerId) return;

    const { error } = await supabaseClient
      .from("leads")
      .update({ owner_id: newOwnerId })
      .eq("id", lead.id);

    if (!error) {
      alert("Lead reassigned successfully.");
      // In production, you'd refetch or use SWR/mutate
    } else {
      alert("Failed to reassign: " + error.message);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{lead.name}</h1>
          <p className="text-gray-600">{lead.company || "No company"}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/leads" className="text-gray-600 hover:underline">
            ← Back to Leads
          </Link>
          <button
            onClick={() => router.push(`/leads/${lead.id}/edit`)}
            className="text-blue-600 hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => router.push(`/deals/new?leadId=${lead.id}`)}
            className="text-sm text-green-600 hover:underline"
          >
            ➕ Create Deal from Lead
          </button>
        </div>
      </div>

      {/* Lead Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Contact Info</h2>
          <p>
            <strong>Email:</strong> {lead.email || "—"}
          </p>
          {lead.upwork_id && (
            <p>
              <strong>Upwork ID:</strong> {lead.upwork_id}
            </p>
          )}
          {lead.linkedin_url && (
            <p>
              <strong>LinkedIn:</strong>{" "}
              <a
                href={lead.linkedin_url}
                target="_blank"
                rel="noopener"
                className="text-blue-600"
              >
                {lead.linkedin_url}
              </a>
            </p>
          )}
        </div>

        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Lead Details</h2>
          <p>
            <strong>Source:</strong> {lead.source}
          </p>
          <p>
            <strong>Industry:</strong> {lead.industry || "—"}
          </p>
          <p>
            <strong>Owner:</strong> {owner?.full_name || "—"}
          </p>
          <p>
            <strong>Department:</strong> {lead.department}
          </p>

          <div className="mt-3">
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={currentStatus}
              onChange={handleStatusChange}
              className="border rounded px-2 py-1 w-full"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowHandoverModal(true)}
            className="mt-3 text-sm text-orange-600 hover:underline flex items-center gap-1"
          >
            ↪️ Reassign Lead
          </button>
        </div>
      </div>

      {/* Description */}
      {lead.description && (
        <div className="mb-8 p-4 border rounded">
          <h2 className="font-semibold mb-2">Description / Notes</h2>
          <p>{lead.description}</p>
        </div>
      )}

      {/* Tasks Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Tasks & Follow-ups</h2>
          <Link
            href={`/leads/${lead.id}/tasks/new`}
            className="text-green-600 hover:underline"
          >
            + New Task
          </Link>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleTaskSubmit} className="mb-6 p-4 border rounded">
          <h3 className="font-medium mb-2">Add Quick Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={newTask.type}
              onChange={(e) =>
                setNewTask({ ...newTask, type: e.target.value as any })
              }
              className="border p-2"
            >
              {taskTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) =>
                setNewTask({ ...newTask, due_date: e.target.value })
              }
              className="border p-2"
              required
            />
            <button
              type="submit"
              disabled={creatingTask}
              className="bg-blue-600 text-white p-2 rounded"
            >
              {creatingTask ? "Adding..." : "Add"}
            </button>
          </div>
          <textarea
            placeholder="Description (optional)"
            value={newTask.description}
            onChange={(e) =>
              setNewTask({ ...newTask, description: e.target.value })
            }
            className="border p-2 mt-2 w-full"
            rows={2}
          />
        </form>

        {/* Task List */}
        {tasks.length === 0 ? (
          <p className="text-gray-500">No tasks yet.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 border rounded flex justify-between items-start ${
                  task.status === "completed"
                    ? "bg-green-50"
                    : !!task.due_date &&
                      isBefore(new Date(task.due_date), new Date())
                    ? "bg-red-100"
                    : "bg-white"
                }`}
              >
                <div>
                  <span className="inline-block px-2 py-1 text-xs font-semibold bg-gray-700 rounded mr-2">
                    {task.type}
                  </span>
                  <span className="text-gray-700">
                    {task.description || "No description"}
                  </span>
                  {!!task.due_date && (
                    <div className="text-sm text-gray-500 mt-1">
                      Due: {format(new Date(task.due_date), "MMM d, yyyy")}
                    </div>
                  )}
                </div>
                <div>
                  {task.status === "completed" ? (
                    <span className="text-green-600">✅ Done</span>
                  ) : !!task.due_date &&
                    isBefore(new Date(task.due_date), new Date()) ? (
                    <span className="text-red-600">⚠️ Overdue</span>
                  ) : (
                    <span className="text-gray-500">Upcoming</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lead && <ActivityTimeline entityType="lead" entityId={lead.id} />}

      {showHandoverModal && (
        <HandoverModal
          leadId={lead.id}
          currentOwnerId={lead.owner_id}
          onClose={() => setShowHandoverModal(false)}
          onReassign={() => {
            // Optional: refetch lead/tasks to reflect new owner
            // For MVP, you can just update local state or refresh
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
