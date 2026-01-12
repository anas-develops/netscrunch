"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { HexColorPicker } from "react-colorful";
import { IntendedCustomerProfile } from "../../types";

export default function EditIntendedCustomerProfileForm({
  intendedCustomerProfile,
  userId,
  canEdit,
}: {
  intendedCustomerProfile: IntendedCustomerProfile;
  userId: string;
  canEdit: boolean;
}) {
  const [formData, setFormData] = useState({
    title: intendedCustomerProfile.title,
    description: intendedCustomerProfile.description,
    tag_color: intendedCustomerProfile.tag_color,
  });
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState(intendedCustomerProfile.tag_color);
  const router = useRouter();

  const supabaseClient = createClient();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Get user's department from profiles
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("department")
      .eq("id", userId)
      .single();

    if (!profile) {
      alert("Profile not found. Please contact admin.");
      return;
    }

    const { error } = await supabaseClient
      .from("intended_customer_profiles")
      .update({
        ...formData,
        tag_color: color,
      })
      .eq("id", intendedCustomerProfile.id)
      .eq("owner_id", userId);

    if (error) alert(error.message);
    else router.push("/intended-customer-profiles");
    setLoading(false);
  };

  return (
    <form onSubmit={handleUpdate} className="space-y-4">
      {/* Name */}
      <input
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Title *"
        className="border p-2 w-full"
        required
      />

      {/* Industry + Description */}
      <textarea
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        placeholder="Description"
        className="border p-2 w-full"
        rows={5}
      ></textarea>

      <label>Tag Color</label>
      <div className="flex gap-4">
        <div className="h-50 w-50" style={{ backgroundColor: color }} />
        <HexColorPicker title="Tag Color" color={color} onChange={setColor} />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white p-2 w-full"
      >
        {loading ? "Updating..." : "Update ICP"}
      </button>
    </form>
  );
}
