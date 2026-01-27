export type Activity = {
  id: string;
  timestamp: string;
  action_type: string;
  description: string | null;
  entity_type: string;
  entity_id: string;
  resolved_source: string;
  user: { full_name: string };
  linkedEntity: {
    type: "deal" | "lead" | "task" | null;
    [key: string]: any;
  };
};

export type TeamMember = { id: string; full_name: string };
