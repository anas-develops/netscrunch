"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { HexColorPicker } from "react-colorful";

export default function NewIntendedCustomerProfilePage() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tag_color: "",
  });
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState("#aabbcc");
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

    const { error } = await supabaseClient
      .from("intended_customer_profiles")
      .insert({
        ...formData,
        owner_id: user.id,
        tag_color: color,
      });

    if (error) alert(error.message);
    else router.push("/intended-customer-profiles");
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Create New ICP</h1>
      <form onSubmit={handleCreate} className="space-y-4">
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
          {loading ? "Creating..." : "Create ICP"}
        </button>
      </form>
    </div>
  );
}
