"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function TaskForm({
  userId,
  leadId,
  dealId,
}: {
  userId: string;
  leadId?: string;
  dealId?: string;
}) {
  const [formData, setFormData] = useState({
    type: "Email" as const,
    description: "",
    due_date: "",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.due_date) {
      alert("Please select a due date");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("tasks").insert({
      type: formData.type,
      description: formData.description.trim() || null,
      due_date: formData.due_date,
      status: "pending", // ✅ Using new status field
      owner_id: userId,
      lead_id: leadId || null,
      deal_id: dealId || null,
    });

    if (error) {
      console.error("Task creation error:", error);
      alert(`Error: ${error.message}`);
    } else {
      // Redirect to source or tasks list
      if (leadId) router.push(`/leads/${leadId}`);
      else if (dealId) router.push(`/deals/${dealId}`);
      else router.push("/tasks");
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Task Type */}
      <div>
        <label className="block text-sm font-medium mb-1">Task Type</label>
        <select
          value={formData.type}
          onChange={(e) =>
            setFormData({ ...formData, type: e.target.value as any })
          }
          className="w-full p-2 border rounded"
          required
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
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Description (Optional)
        </label>
        <textarea
          placeholder="e.g., Discuss pricing, Send proposal..."
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="w-full p-2 border rounded"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Task"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
