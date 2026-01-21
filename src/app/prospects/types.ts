export type Prospect = {
  id: string;
  name: string;
  status: string;
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
  owner: Owner;
  tagged_icp: TaggedIcp;
  created_at: string;
};

export type Owner = {
  id: string;
  full_name: string;
};

export type TaggedIcp = {
  title: string;
  tag_color: string;
};

export type IntendedCustomerProfile = {
  id: string;
  title: string;
};
