"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Prospect, Owner, IntendedCustomerProfile } from "../types";

export default function ProspectDetailClient({
  prospect,
  owner,
  icps,
  userId,
}: {
  prospect: Prospect;
  owner: Owner | null;
  icps: Array<
    IntendedCustomerProfile & { value: string; label: string }
  > | null;
  userId: string;
}) {
  const supabaseClient = createClient();
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(prospect.status);

  const statusOptions = [
    "Not Contacted",
    "Not Qualified",
    "Pre-Qualified",
    "Lost Lead",
    "Junk Lead",
    "Contacted",
    "Contacted in Future",
    "Attempted to Contact",
  ];

  const handleStatusChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newStatus = e.target.value;
    const { error } = await supabaseClient
      .from("prospects")
      .update({ status: newStatus })
      .eq("id", prospect.id);
    if (!error) {
      setCurrentStatus(newStatus);
    }
  };

  const handleReassign = async () => {
    const newOwnerId = prompt("Enter new owner user ID (from Supabase Auth):");
    if (!newOwnerId) return;

    const { error } = await supabaseClient
      .from("prospects")
      .update({ owner_id: newOwnerId })
      .eq("id", prospect.id);

    if (!error) {
      alert("Prospect reassigned successfully.");
    } else {
      alert("Failed to reassign: " + error.message);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{prospect.name}</h1>
          <p className="text-gray-600">{prospect.company || "No company"}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/prospects" className="text-gray-600 hover:underline">
            ← Back to Prospects
          </Link>
          <button
            onClick={() => router.push(`/prospects/${prospect.id}/edit`)}
            className="text-blue-600 hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => router.push(`/leads/new?prospect_id=${prospect.id}`)}
            className="text-sm text-green-600 hover:underline"
          >
            ➕ Convert to Lead
          </button>
        </div>
      </div>

      {/* Prospect Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Contact Info</h2>
          <p>
            <strong>Email:</strong> {prospect.email || "—"}
          </p>
          <p>
            <strong>Phone:</strong> {prospect.phone || "—"}
          </p>
          <p>
            <strong>Job Title:</strong> {prospect.job_title || "—"}
          </p>
          <p>
            <strong>Company:</strong> {prospect.company || "—"}
          </p>
        </div>

        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Status & Ownership</h2>
          <p>
            <strong>Status:</strong>{" "}
            <select
              value={currentStatus}
              onChange={handleStatusChange}
              className="border rounded px-2 py-1 text-sm"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </p>
          <p>
            <strong>Owner:</strong> {owner?.full_name || "Unassigned"}
          </p>
          <p>
            <strong>ICP Tag:</strong>{" "}
            <span
              className="px-2 py-1 rounded text-sm"
              style={{
                backgroundColor: prospect.tagged_icp.tag_color,
              }}
            >
              {prospect.tagged_icp.title}
            </span>
          </p>
        </div>

        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Location</h2>
          <p>
            <strong>City:</strong> {prospect.city || "—"}
          </p>
          <p>
            <strong>State:</strong> {prospect.state || "—"}
          </p>
          <p>
            <strong>Zip Code:</strong> {prospect.zip_code || "—"}
          </p>
        </div>

        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Links</h2>
          <p>
            <strong>Website:</strong>{" "}
            {prospect.website ? (
              <a
                href={prospect.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {prospect.website}
              </a>
            ) : (
              "—"
            )}
          </p>
          <p>
            <strong>LinkedIn:</strong>{" "}
            {prospect.linked_in_url ? (
              <a
                href={prospect.linked_in_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {prospect.linked_in_url}
              </a>
            ) : (
              "—"
            )}
          </p>
          <p>
            <strong>Jobs Board:</strong>{" "}
            {prospect.company_jobs_board_url ? (
              <a
                href={prospect.company_jobs_board_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Visit
              </a>
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-4">Actions</h2>
        <div className="flex gap-4">
          <button
            onClick={handleReassign}
            className="text-sm bg-sky-400 px-3 py-2 rounded hover:bg-sky-300"
          >
            Reassign Prospect
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="mt-6 text-sm text-gray-500">
        <p>Created: {prospect.created_at}</p>
        <p>ID: {prospect.id}</p>
      </div>
    </div>
  );
}
