// app/leads/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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
      .from('leads')
      .select('id, name, company, source, status, owner_id')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setLeads(data || []);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <button
          onClick={() => router.push('/leads/new')}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          + New Lead
        </button>
      </div>

      <div className="space-y-4">
        {leads.map((lead) => (
          <div key={lead.id} className="p-4 border rounded flex justify-between">
            <div>
              <h3 className="font-semibold">{lead.name}</h3>
              <p>{lead.company} • {lead.source}</p>
              <span className="text-sm bg-gray-200 px-2 py-1 rounded">{lead.status}</span>
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