"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function HandoverModal({
  leadId,
  currentOwnerId,
  onClose,
  onReassign,
}: {
  leadId: string;
  currentOwnerId: string;
  onClose: () => void;
  onReassign: () => void;
}) {
  const [newOwnerId, setNewOwnerId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [owners, setOwners] = useState<{ id: string; full_name: string }[]>([]);
  const [department, setDepartment] = useState("");

  // Fetch eligible owners on open (you could pre-fetch in parent)
  useEffect(() => {
    const fetchOwners = async () => {
      const supabase = createClient();
      // Get current user's department to limit scope (optional)
      const { data: profile } = await supabase
        .from("profiles")
        .select("department")
        .eq("id", currentOwnerId)
        .single();

      if (profile) {
        setDepartment(profile.department);
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("department", profile.department)
          .neq("id", currentOwnerId); // exclude self
        setOwners(data || []);
      }
    };
    fetchOwners();
  }, []);

  const handleReassign = async () => {
    if (!newOwnerId) return;
    setLoading(true);

    const supabase = createClient();

    // 1. Update lead owner
    const { error: leadErr } = await supabase
      .from("leads")
      .update({ owner_id: newOwnerId })
      .eq("id", leadId);

    // 2. Log handover as task/activity (optional but recommended)
    if (!leadErr) {
      await supabase.from("tasks").insert({
        type: "Handover",
        description: note || `Lead reassigned from current owner`,
        lead_id: leadId,
        owner_id: currentOwnerId,
        due_date: new Date().toISOString().split("T")[0],
        completed: true,
      });
    }

    setLoading(false);
    if (!leadErr) {
      onReassign();
      onClose();
    } else {
      alert("Failed to reassign lead");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Reassign Lead</h2>
        <p className="text-sm text-gray-600 mb-4">
          Select a new owner and add an optional note.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">New Owner</label>
          <select
            value={newOwnerId}
            onChange={(e) => setNewOwnerId(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select owner...</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            Note (Optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={2}
            placeholder="Why are you handing this off?"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleReassign}
            disabled={!newOwnerId || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Reassigning..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
