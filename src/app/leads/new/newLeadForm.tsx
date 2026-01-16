"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Prospect } from "../types";

export default function NewLeadForm({ prospect }: { prospect: Prospect }) {
  const [formData, setFormData] = useState({
    ...(!!prospect && prospect.id
      ? {
          name: prospect.name,
          company: prospect.company || "",
          email: prospect.email,
          upwork_id: "",
          linkedin_url: prospect.linked_in_url || "",
          source: "B2B" as const,
          industry: "",
          description: "",
          prospect_id: prospect.id,
        }
      : {
          name: "",
          company: "",
          email: "",
          upwork_id: "",
          linkedin_url: "",
          source: "Upwork" as const,
          industry: "",
          description: "",
        }),
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabaseClient = createClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Get current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Get user's department from profiles
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("department")
      .eq("id", user.id)
      .single();

    if (!profile) {
      alert("Profile not found. Please contact admin.");
      return;
    }

    const { error } = await supabaseClient.from("leads").insert({
      ...formData,
      owner_id: user.id,
      department: profile.department,
    });

    if (error) alert(error.message);
    else router.push("/leads");
    setLoading(false);
  };

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      {/* Name */}
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Name *"
        className="border p-2 w-full"
        required
      />

      {/* Company */}
      <input
        value={formData.company}
        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
        placeholder="Company"
        className="border p-2 w-full"
      />

      {/* Source */}
      <select
        value={formData.source}
        onChange={(e) =>
          setFormData({ ...formData, source: e.target.value as any })
        }
        className="border p-2 w-full"
      >
        <option>Upwork</option>
        <option>Freelancer</option>
        <option>Recruitment</option>
        <option>B2B</option>
        <option>Referral</option>
      </select>

      {/* Email / IDs */}
      <input
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email (optional)"
        type="email"
        className="border p-2 w-full"
      />
      <input
        value={formData.upwork_id}
        onChange={(e) =>
          setFormData({ ...formData, upwork_id: e.target.value })
        }
        placeholder="Upwork ID (if applicable)"
        className="border p-2 w-full"
      />
      <input
        value={formData.linkedin_url}
        onChange={(e) =>
          setFormData({ ...formData, linkedin_url: e.target.value })
        }
        placeholder="LinkedIn URL (if applicable)"
        className="border p-2 w-full"
      />

      {/* Industry + Description */}
      <input
        value={formData.industry}
        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
        placeholder="Industry"
        className="border p-2 w-full"
      />
      <textarea
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        placeholder="Description / Notes"
        className="border p-2 w-full"
        rows={3}
      ></textarea>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white p-2 w-full"
      >
        {loading ? "Creating..." : "Create Lead"}
      </button>
    </form>
  );
}
