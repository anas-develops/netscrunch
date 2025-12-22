"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  Eye,
} from "lucide-react";
import { Task as TaskType } from "../../types";

type Task = TaskType & {
  owner_id: string;
  owner: { full_name: string; department: string };
};

export function EditTaskForm({
  task,
  userId,
  canEdit,
}: {
  task: Task;
  userId: string;
  canEdit: boolean;
}) {
  const [formData, setFormData] = useState({
    type: task.type,
    description: task.description || "",
    due_date: task.due_date || "",
    status: task.status,
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Prevent editing if cancelled
  useEffect(() => {
    if (task.status === "cancelled") {
      alert("Cancelled tasks cannot be edited.");
      router.push(`/tasks/${task.id}`);
    }
  }, [task.status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.due_date) {
      alert("Please select a due date");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("tasks")
      .update({
        type: formData.type,
        description: formData.description.trim() || null,
        due_date: formData.due_date,
        status: formData.status,
      })
      .eq("id", task.id)
      .eq("owner_id", userId); // Extra security

    if (error) {
      console.error("Update error:", error);
      alert(`Error: ${error.message}`);
    } else {
      router.push(`/tasks/${task.id}`);
    }
    setLoading(false);
  };

  const taskTypes = [
    { value: "Call", label: "📞 Call" },
    { value: "Email", label: "✉️ Email" },
    { value: "Message", label: "💬 Message" },
    { value: "Proposal", label: "📄 Proposal" },
    { value: "Follow-up", label: "🔄 Follow-up" },
  ];

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "Call":
        return <Phone className="w-5 h-5" />;
      case "Email":
        return <Mail className="w-5 h-5" />;
      case "Message":
        return <MessageSquare className="w-5 h-5" />;
      case "Proposal":
        return <FileText className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Linked Entity Banner */}
      {(task.lead || task.deal) && (
        <div className="p-3 bg-blue-900 text-blue-200 rounded mb-4">
          <strong>Linked to:</strong>{" "}
          {task.lead
            ? `${task.lead.name} ${
                task.lead.company ? `(${task.lead.company})` : ""
              }`
            : task.deal?.lead_name}
        </div>
      )}

      {/* Task Type */}
      <div>
        <label className="block text-sm font-medium mb-1">Task Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full p-2 border rounded"
          disabled={!canEdit}
        >
          {taskTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Due Date */}
      <div>
        <label className="block text-sm font-medium mb-1">Due Date *</label>
        <input
          type="date"
          value={formData.due_date}
          onChange={(e) =>
            setFormData({ ...formData, due_date: e.target.value })
          }
          className="w-full p-2 border rounded"
          disabled={!canEdit}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="w-full p-2 border rounded"
          rows={3}
          disabled={!canEdit}
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <select
          value={formData.status}
          onChange={(e) =>
            setFormData({ ...formData, status: e.target.value as any })
          }
          className="w-full p-2 border rounded"
          disabled={!canEdit}
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          {/* Do not allow switching to 'cancelled' here — use Cancel button */}
        </select>
      </div>

      {/* Cancellation Reason (Read-only) */}
      {task.status === "cancelled" && task.cancel_reason && (
        <div className="p-3 bg-red-100 border border-red-300 rounded">
          <strong>Cancellation Reason:</strong> {task.cancel_reason}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !canEdit}
          className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
        <Link
          href={`/tasks/${task.id}`}
          className="flex-1 bg-gray-500 text-white p-2 rounded hover:bg-gray-600 text-center"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
