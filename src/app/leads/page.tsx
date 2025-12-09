// app/leads/page.tsx
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Lead = {
  id: string;
  name: string;
  company: string | null;
  source: string;
  status: string;
  owner_id: string;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, company, source, status, owner_id")
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setLeads(data || []);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <div className="p-8">Loading...</div>;

  function StatusBadge(status: string) {
    return (
      <span
        className={`text-sm ${
          status === "Qualified"
            ? "bg-green-500 text-white"
            : status === "Applied"
            ? "bg-blue-400 text-white"
            : status === "Conversation"
            ? "bg-orange-500 text-white"
            : "bg-yellow-200"
        } px-2 py-1 rounded`}
      >
        {status}
      </span>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div>
          <button
            onClick={() => router.push("/leads/import")}
            className="bg-green-800 text-white px-4 py-2 rounded mr-2"
          >
            + Import Leads
          </button>
          <button
            onClick={() => router.push("/leads/new")}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            + New Lead
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="p-4 border rounded flex justify-between"
          >
            <div>
              <h3 className="font-semibold">{lead.name}</h3>
              <p>
                {lead.company} • {lead.source}
              </p>
              {lead.status && StatusBadge(lead.status)}
            </div>
            <button
              onClick={() => router.push(`/leads/${lead.id}`)}
              className="text-blue-600"
            >
              View
            </button>
          </div>
        ))}
      </div>

      <button onClick={handleLogout} className="mt-8 text-red-600">
        Logout
      </button>
    </div>
  );
}
