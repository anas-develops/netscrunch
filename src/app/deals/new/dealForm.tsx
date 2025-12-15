"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
  name: string;
  company: string | null;
  owner_id: string;
  department: string;
} | null;

export function DealForm({
  userId,
  userDepartment,
  lead,
}: {
  userId: string;
  userDepartment: string;
  lead: Lead;
}) {
  const [formData, setFormData] = useState({
    name: lead ? `${lead.name} - Opportunity` : "",
    value: "",
    close_date: "",
    stage: "Prospecting" as const,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("deals").insert({
      name: formData.name,
      value: formData.value ? parseFloat(formData.value) : null,
      close_date: formData.close_date || null,
      stage: formData.stage,
      notes: formData.notes || null,
      owner_id: userId,
      lead_id: lead?.id || null,
    });

    if (error) {
      alert("Error creating deal: " + error.message);
    } else {
      router.push("/deals");
    }
    setLoading(false);
  };

  const stageOptions = [
    "Prospecting",
    "Qualification",
    "Proposal",
    "Negotiation",
    "Won",
    "Lost",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {lead && (
        <div className="p-3 bg-blue-900 border border-blue-700 rounded text-blue-200">
          <strong>Linked Lead:</strong> {lead.name} (
          {lead.company || "No company"})
        </div>
      )}

      <input
        type="text"
        placeholder="Deal Name *"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className="w-full p-2 border rounded"
        required
      />

      <input
        type="number"
        placeholder="Estimated Value (USD)"
        value={formData.value}
        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
        className="w-full p-2 border rounded"
      />

      <input
        type="date"
        value={formData.close_date}
        onChange={(e) =>
          setFormData({ ...formData, close_date: e.target.value })
        }
        className="w-full p-2 border rounded"
      />

      <select
        value={formData.stage}
        onChange={(e) =>
          setFormData({ ...formData, stage: e.target.value as any })
        }
        className="w-full p-2 border rounded"
      >
        {stageOptions.map((stage) => (
          <option key={stage} value={stage}>
            {stage}
          </option>
        ))}
      </select>

      <textarea
        placeholder="Notes"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        className="w-full p-2 border rounded"
        rows={3}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white p-2 rounded"
      >
        {loading ? "Creating..." : "Create Deal"}
      </button>
    </form>
  );
}
