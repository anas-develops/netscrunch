export type Owner = {
  id: string;
  full_name: string;
};

export type IntendedCustomerProfile = {
  id: string;
  title: string;
  description: string;
  tag_color: string;
  owner_id: string;
  owner: Owner;
  created_at: string;
};
