"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Deal } from "../../types";

export function EditDealForm({
  initialDeal,
  userId,
}: {
  initialDeal: Deal;
  userId: string;
}) {
  const [formData, setFormData] = useState({
    name: initialDeal.name,
    value: initialDeal.value?.toString() || "",
    close_date: initialDeal.close_date || "",
    stage: initialDeal.stage,
    notes: initialDeal.notes || "",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("deals")
      .update({
        name: formData.name,
        value: formData.value ? parseFloat(formData.value) : null,
        close_date: formData.close_date || null,
        stage: formData.stage,
        notes: formData.notes || null,
        // owner_id and lead_id are NOT editable here (preserved from creation)
      })
      .eq("id", initialDeal.id);

    if (error) {
      alert("Error updating deal: " + error.message);
    } else {
      router.push(`/deals/${initialDeal.id}`);
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
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Deal</h1>
        <Link
          href={`/deals/${initialDeal.id}`}
          className="text-gray-600 hover:underline"
        >
          ← Back to Deal
        </Link>
      </div>

      {initialDeal.lead_id && initialDeal.lead && (
        <div className="mb-6 p-3 bg-blue-900 border border-blue-700 rounded text-blue-200">
          <strong>Linked to Lead:</strong> {initialDeal.lead.name} (
          {initialDeal.lead.company || "No company"})
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
          onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
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

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 text-white p-2 rounded"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/deals/${initialDeal.id}`)}
            className="flex-1 bg-gray-500 text-white p-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
