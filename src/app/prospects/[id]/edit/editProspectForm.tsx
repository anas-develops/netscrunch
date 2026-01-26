"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import AsyncSelect from "react-select/async";
import { components } from "react-select";
import { Prospect } from "../../types";

export default function EditProspectForm({ prospect }: { prospect: Prospect }) {
  const [formData, setFormData] = useState({
    name: prospect.name || "",
    tagged_icp_id: prospect.tagged_icp_id || "",
    company: prospect.company || "",
    job_title: prospect.job_title || "",
    phone: prospect.phone || "",
    email: prospect.email || "",
    website: prospect.website || "",
    city: prospect.city || "",
    state: prospect.state || "",
    zip_code: prospect.zip_code || "",
    linked_in_url: prospect.linked_in_url || "",
    company_jobs_board_url: prospect.company_jobs_board_url || "",
    owner_id: prospect.owner_id || "",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabaseClient = createClient();

  // Custom Option component to display color in the dropdown
  const CustomOption = (props: any) => {
    const { data } = props;
    return (
      <components.Option {...props}>
        <div className="flex items-center">
          <div
            className="w-4 h-4 rounded mr-2 border border-gray-300"
            style={{ backgroundColor: data.tag_color }}
          />
          <span className="text-black">{data.label}</span>
        </div>
      </components.Option>
    );
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Get current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { error } = await supabaseClient
      .from("prospects")
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prospect.id)
      .eq("owner_id", user.id);

    if (error) alert(error.message);
    else router.push("/prospects");
    setLoading(false);
  };

  const getIcpTagOptions = async (
    inputValue: string
  ): Promise<{ value: string; label: string; tag_color: string }[]> => {
    return new Promise<{ value: string; label: string; tag_color: string }[]>(
      (resolve, reject) => {
        let icpDataQuery = supabaseClient
          .from("intended_customer_profiles")
          .select("value:id, label:title, tag_color");

        if (!!inputValue) {
          icpDataQuery = icpDataQuery.or(
            `title.ilike.%${inputValue}%,description.ilike.%${inputValue}%`
          );
        }

        icpDataQuery.then((res) => resolve(res.data || []));
      }
    );
  };

  return (
    <div className="p-8 max-w-2xl">
      <form onSubmit={handleUpdate} className="space-y-4">
        {/* Tag */}
        <AsyncSelect
          cacheOptions
          defaultOptions
          loadOptions={getIcpTagOptions}
          components={{
            Option: CustomOption,
          }}
          onChange={(e) =>
            setFormData({
              ...formData,
              tagged_icp_id: e ? e.value : "",
            })
          }
          className="border p-2 w-full"
          required
          placeholder="Select ICP to tag with *"
          value={formData.tagged_icp_id}
        />

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
          onChange={(e) =>
            setFormData({ ...formData, company: e.target.value })
          }
          placeholder="Company"
          className="border p-2 w-full"
        />

        {/* Job Title */}
        <input
          value={formData.job_title}
          onChange={(e) =>
            setFormData({ ...formData, job_title: e.target.value })
          }
          placeholder="Job Title"
          className="border p-2 w-full"
        />

        {/* Phone Number */}
        <input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="Phone Number"
          className="border p-2 w-full"
        />

        {/* Email */}
        <input
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Email *"
          className="border p-2 w-full"
          required
        />

        {/* Website */}
        <input
          value={formData.website}
          onChange={(e) =>
            setFormData({ ...formData, website: e.target.value })
          }
          placeholder="Website"
          className="border p-2 w-full"
        />

        {/* City */}
        <input
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          placeholder="City"
          className="border p-2 w-full"
        />

        {/* State */}
        <input
          value={formData.state}
          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          placeholder="State"
          className="border p-2 w-full"
        />

        {/* Zip Code */}
        <input
          value={formData.zip_code}
          onChange={(e) =>
            setFormData({ ...formData, zip_code: e.target.value })
          }
          placeholder="Zip Code"
          className="border p-2 w-full"
        />

        {/* LinkedIn URL */}
        <input
          value={formData.linked_in_url}
          onChange={(e) =>
            setFormData({ ...formData, linked_in_url: e.target.value })
          }
          placeholder="LinkedIn URL"
          className="border p-2 w-full"
        />

        {/* Company Jobs Board URL */}
        <input
          value={formData.company_jobs_board_url}
          onChange={(e) =>
            setFormData({ ...formData, company_jobs_board_url: e.target.value })
          }
          placeholder="Company Jobs Board URL"
          className="border p-2 w-full"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white p-2 w-full"
        >
          {loading ? "Updating..." : "Update Prospect"}
        </button>
      </form>
    </div>
  );
}
