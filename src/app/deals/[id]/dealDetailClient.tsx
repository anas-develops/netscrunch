"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Deal, Owner, Task } from "../types";
import { ActivityTimeline } from "@/app/common/activityTimeline";
import { useState } from "react";
import { format, isBefore } from "date-fns";

export default function DealDetailClient({
  deal,
  tasks,
  userId,
}: {
  deal: Deal;
  tasks: Task[];
  userId: string;
}) {
  const [newTask, setNewTask] = useState({
    type: "Email" as const,
    description: "",
    due_date: "",
  });
  const [creatingTask, setCreatingTask] = useState(false);

  const supabase = createClient();

  const stageColors: Record<string, string> = {
    Prospecting: "bg-gray-100 text-gray-800",
    Qualification: "bg-blue-100 text-blue-800",
    Proposal: "bg-purple-100 text-purple-800",
    Negotiation: "bg-orange-100 text-orange-800",
    Won: "bg-green-100 text-green-800",
    Lost: "bg-red-100 text-red-800",
  };

  const taskTypes = ["Call", "Email", "Message", "Proposal", "Follow-up"];

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTask(true);

    const { error } = await supabase.from("tasks").insert({
      type: newTask.type,
      description: newTask.description || null,
      due_date: newTask.due_date,
      status: "pending",
      deal_id: deal.id,
      owner_id: userId,
    });

    if (!error) {
      setNewTask({ type: "Email", description: "", due_date: "" });
      // Optional: optimistic update or refetch
    }
    setCreatingTask(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{deal.name}</h1>
          <p className="text-gray-600">Owner: {deal.owner_id?.full_name}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/deals" className="text-gray-600 hover:underline">
            ← Back to All Deals
          </Link>
          <Link
            href={`/deals/${deal.id}/edit`}
            className="text-blue-600 hover:underline"
          >
            ✏️ Edit
          </Link>
        </div>
      </div>

      {/* Deal Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-3">Deal Details</h2>
          <p>
            <strong>Stage:</strong>{" "}
            <span
              className={`inline-block px-2 py-1 text-xs rounded-full ${
                stageColors[deal.stage] || "bg-gray-100"
              }`}
            >
              {deal.stage}
            </span>
          </p>
          <p>
            <strong>Estimated Value:</strong>{" "}
            {deal.value ? `$${deal.value.toLocaleString()}` : "—"}
          </p>
          <p>
            <strong>Close Date:</strong> {deal.close_date || "—"}
          </p>
        </div>

        <div className="border rounded p-4">
          <h2 className="font-semibold mb-3">Lead</h2>
          {deal.lead_id ? (
            <div>
              <p>
                <Link
                  href={`/leads/${deal.lead_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {deal.lead_name}
                </Link>
              </p>
              <p>
                {deal.lead_company || "No company"} • {deal.lead!.source}
              </p>
            </div>
          ) : (
            <p className="text-gray-500">Standalone deal (no linked lead)</p>
          )}
        </div>
      </div>

      {/* Notes */}
      {deal.notes && (
        <div className="mb-8 p-4 border rounded ">
          <h2 className="font-semibold mb-2">Notes</h2>
          <p>{deal.notes}</p>
        </div>
      )}

      {/* Tasks Section */}
      <div className="mb-8">
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
                  <Link href={`/tasks/${task.id}`}>
                    <span className="text-gray-700 hover:underline">
                      {task.description || "No description"}
                    </span>
                  </Link>
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

      {deal && <ActivityTimeline entityType="deal" entityId={deal.id} />}
    </div>
  );
}
