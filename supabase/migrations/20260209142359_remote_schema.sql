set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_pending_task_reminders()
 RETURNS TABLE(task_id uuid, task_type text, task_description text, due_date date, owner_id uuid, owner_email text, owner_full_name text, lead_id uuid, lead_name text, lead_company text, deal_id uuid, deal_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$BEGIN
  RETURN QUERY
  SELECT
    t.id AS task_id,
    t.type::TEXT,
    t.description::TEXT,
    t.due_date,
    t.owner_id,
    u.email::TEXT,
    p.full_name::TEXT,
    t.lead_id,
    l.name::TEXT,
    l.company AS lead_company,
    t.deal_id,
    d.name AS deal_name
  FROM public.tasks t
  JOIN public.profiles p ON t.owner_id = p.id
  JOIN auth.users u ON p.id = u.id
  LEFT JOIN public.leads l ON t.lead_id = l.id
  LEFT JOIN public.deals d ON t.deal_id = d.id
  WHERE t.status = 'pending'
    AND t.due_date >= CURRENT_DATE;
END;$function$
;


