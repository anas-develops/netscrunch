// app/leads/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { format, isBefore } from "date-fns";

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

type Task = {
  id: string;
  type: string;
  description: string | null;
  due_date: string;
  completed: boolean;
  created_at: string;
};

export default function ViewLeadPage() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({
    type: "Email",
    description: "",
    due_date: "",
  });
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchLead();
  }, [id]);

  async function fetchLead() {
    if (!id || typeof id !== "string") return;

    // Fetch lead
    const { data: leadData, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (leadErr) {
      console.error("Lead fetch error:", leadErr);
      return;
    }

    // Fetch owner
    const { data: ownerData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", leadData.owner_id)
      .single();

    // Fetch tasks
    const { data: taskData } = await supabase
      .from("tasks")
      .select("*")
      .eq("lead_id", id)
      .order("due_date", { ascending: true });

    setLead(leadData);
    setOwner(ownerData);
    setTasks(taskData || []);
    setLoading(false);
  }

  const statusOptions = ["Applied", "Conversation", "Interview", "Won", "Lost"];
  const taskTypes = ["Call", "Email", "Message", "Proposal", "Follow-up"];

  const handleStatusChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setLoading(true);
    const { error } = await supabase
      .from("leads")
      .update({ status: e.target.value })
      .eq("id", id);
    if (!error) {
      setLead({ ...lead!, status: e.target.value });
    }
    setLoading(false);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTask(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("tasks").insert({
      type: newTask.type,
      description: newTask.description || null,
      due_date: newTask.due_date,
      completed: false,
      lead_id: id,
      owner_id: user.id,
    });

    if (!error) {
      setNewTask({ type: "Email", description: "", due_date: "" });
      fetchLead(); // refresh tasks
    }
    setCreatingTask(false);
  };

  const handleReassign = async () => {
    const newOwnerId = prompt("Enter new owner user ID (from Supabase Auth):");
    if (!newOwnerId) return;

    const { error } = await supabase
      .from("leads")
      .update({ owner_id: newOwnerId })
      .eq("id", id);

    if (!error) {
      alert("Lead reassigned successfully.");
      fetchLead();
    } else {
      alert("Failed to reassign: " + error.message);
    }
  };

  if (loading) return <div className="p-8">Loading lead...</div>;
  if (!lead) return <div className="p-8 text-red-600">Lead not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{lead.name}</h1>
          <p className="text-gray-600">{lead.company || "No company"}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/leads`)}
            className="text-gray-600 hover:underline"
          >
            ← Back to Leads
          </button>
          <button
            onClick={() => router.push(`/leads/${id}/edit`)}
            className="text-blue-600 hover:underline"
          >
            Edit
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
              value={lead.status}
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
            onClick={handleReassign}
            className="mt-3 text-sm text-orange-600 hover:underline"
          >
            ↪️ Reassign Lead (Handover)
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
            href={`/leads/${id}/tasks/new`}
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
              onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
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
                  task.completed
                    ? "bg-green-50"
                    : isBefore(new Date(task.due_date), new Date())
                    ? "bg-red-50"
                    : "bg-gray-200"
                }`}
              >
                <div>
                  <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-800 rounded mr-2">
                    {task.type}
                  </span>
                  <span className="text-gray-600">
                    {task.description || "No description"}
                  </span>
                  <div className="text-sm text-gray-500 mt-1">
                    Due: {format(new Date(task.due_date), "MMM d, yyyy")}
                  </div>
                </div>
                <div>
                  {task.completed ? (
                    <span className="text-green-600">✅ Done</span>
                  ) : isBefore(new Date(task.due_date), new Date()) ? (
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

      {/* Activity Feed (MVP: just tasks for now) */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Activity Feed</h2>
        {tasks.length === 0 ? (
          <p className="text-gray-500">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {[...tasks]
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
              .map((task) => (
                <div
                  key={task.id}
                  className="p-3 border-l-4 border-blue-500 bg-gray-900"
                >
                  <p>
                    <strong>{task.type}</strong> created for {lead.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(task.created_at), "MMM d, yyyy HH:mm")}
                  </p>
                  {task.description && (
                    <p className="mt-1">{task.description}</p>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
