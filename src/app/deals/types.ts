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

export type Owner = {
  id: string;
  full_name: string;
};
