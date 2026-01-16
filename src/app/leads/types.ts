export type Lead = {
  id: string;
  name: string;
  company: string | null;
  source: string;
  status: string;
  owner_id: {
    full_name: string;
  };
  created_at: string;
  prospect_id: string | null;
};

export type Owner = {
  id: string;
  full_name: string;
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

export type Prospect = {
  id: string;
  name: string;
  tagged_icp_id: string;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  email: string;
  website: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  linked_in_url: string | null;
  company_jobs_board_url: string | null;
  owner_id: string;
  created_at: string;
};
