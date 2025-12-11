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
};

export type Owner = {
  id: string;
  full_name: string;
};
