export type Deal = {
  id: string;
  name: string;
  value: number | null;
  close_date: string | null;
  stage: string;
  owner_id: { full_name: string };
  lead_id: string | null;
  owner_name: string | null;
  lead_name: string | null;
  lead_company: string | null;
  lead: {
    id: string;
    name: string;
    company: string | null;
    source: string;
  } | null;
  notes: string | null;
};

export type Task = {
  id: string;
  type: string | null;
  description: string | null;
  due_date: string | null;
  status: string;
  deal_id: string | null;
  lead_id: string | null;
  lead: {
    id: string;
    name: string;
    company: string | null;
    source: string;
  } | null;
  deal: {
    owner_name: string | null;
    lead_name: string | null;
    lead_company: string | null;
  } | null;
  owner: {
    full_name: string;
  };
  created_at: string;
};

export type Owner = {
  id: string;
  full_name: string;
};
