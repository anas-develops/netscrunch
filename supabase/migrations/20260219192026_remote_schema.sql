set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(time_period text DEFAULT 'monthly'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  start_date DATE;
  -- end_date removed because it is redundant for "lookback" periods 
  -- and CURRENT_DATE excludes today's timestamps
  
  active_leads JSON;
  personal_active_leads JSON;
  deal_pipeline JSON;
  personal_deal_pipeline JSON;
  task_summary JSON;
  personal_task_summary JSON;
  revenue_by_stream JSON;
  personal_revenue_by_stream JSON;
  won_deals_by_industry JSON;
  personal_won_deals_by_industry JSON;
  leads_by_industry JSON;
  personal_leads_by_industry JSON;
  team_leads JSON;
  team_deals JSON;
  team_response JSON;
BEGIN
  -- 1. Calculate Start Date Only
  SELECT 
    CASE 
      WHEN time_period = 'daily' THEN CURRENT_DATE - INTERVAL '1 day'
      WHEN time_period = 'weekly' THEN CURRENT_DATE - INTERVAL '7 days'
      WHEN time_period = 'monthly' THEN CURRENT_DATE - INTERVAL '1 month'
      WHEN time_period = 'quarterly' THEN CURRENT_DATE - INTERVAL '3 months'
      ELSE CURRENT_DATE - INTERVAL '1 month'
    END::DATE INTO start_date;

  -- 2. Active Leads by Source
  SELECT json_agg(json_build_object('source', source, 'count', cnt))
  INTO active_leads
  FROM (
    SELECT source, count(*) AS cnt
    FROM leads
    WHERE status IN ('Warmed-Up', 'Negotiating', 'Service Initiated')
    AND created_at >= start_date
    GROUP BY source
  ) AS grouped_leads;
  
  SELECT json_agg(json_build_object('source', source, 'count', cnt))
  INTO personal_active_leads
  FROM (
    SELECT source, count(*) AS cnt
    FROM leads
    WHERE status IN ('Warmed-Up', 'Negotiating', 'Service Initiated')
    AND owner_id = auth.uid()
    AND created_at >= start_date
    GROUP BY source
  ) AS grouped_leads;

  -- 3. Deal Pipeline
  SELECT json_agg(json_build_object('stage', stage, 'count', cnt, 'value', total_value))
  INTO deal_pipeline
  FROM (
    SELECT stage, count(*) AS cnt, coalesce(sum(value), 0) AS total_value
    FROM deals
    WHERE stage NOT IN ('Won', 'Lost')
    AND created_at >= start_date
    GROUP BY stage
  ) AS grouped_deals;

  SELECT json_agg(json_build_object('stage', stage, 'count', cnt, 'value', total_value))
  INTO personal_deal_pipeline
  FROM (
    SELECT stage, count(*) AS cnt, coalesce(sum(value), 0) AS total_value
    FROM deals
    WHERE stage NOT IN ('Won', 'Lost')
    AND owner_id = auth.uid()
    AND created_at >= start_date
    GROUP BY stage
  ) AS grouped_deals;

  -- 4. Task Summary
  SELECT json_build_object(
    'overdue', count(*) FILTER (WHERE due_date < CURRENT_DATE AND status = 'pending'),
    'due_today', count(*) FILTER (WHERE due_date = CURRENT_DATE AND status = 'pending'),
    'followups_due_today', count(*) FILTER (WHERE due_date = CURRENT_DATE AND type = 'Email' AND status = 'pending'),
    'meetings_due_today', count(*) FILTER (WHERE due_date = CURRENT_DATE AND type = 'Call' AND status = 'pending')
  )
  INTO task_summary
  FROM tasks;
  
  SELECT json_build_object(
    'overdue', count(*) FILTER (WHERE due_date < CURRENT_DATE AND owner_id = auth.uid() AND status = 'pending'),
    'due_today', count(*) FILTER (WHERE due_date = CURRENT_DATE AND owner_id = auth.uid() AND status = 'pending'),
    'followups_due_today', count(*) FILTER (WHERE due_date = CURRENT_DATE AND owner_id = auth.uid() AND type = 'Email' AND status = 'pending'),
    'meetings_due_today', count(*) FILTER (WHERE due_date = CURRENT_DATE AND owner_id = auth.uid() AND type = 'Call' AND status = 'pending')
  )
  INTO personal_task_summary
  FROM tasks;

  -- 5. Revenue by Stream
  SELECT json_agg(json_build_object(
    'source', source,
    'active_leads', coalesce(active_leads_count, 0),
    'won_deals', coalesce(won_deals_count, 0),
    'total_value', coalesce(total_won_value, 0)
  ))
  INTO revenue_by_stream
  FROM (
    SELECT streams.source, stats.active_leads_count, stats.won_deals_count, stats.total_won_value
    FROM (VALUES ('Upwork'), ('Recruitment'), ('B2B')) AS streams(source)
    LEFT JOIN (
      SELECT 
        l.source,
        count(*) FILTER (WHERE l.status IN ('Applied', 'Conversation', 'Interview') AND l.created_at >= start_date) AS active_leads_count,
        count(d.id) FILTER (WHERE d.stage = 'Won' AND d.created_at >= start_date) AS won_deals_count,
        coalesce(sum(d.value) FILTER (WHERE d.stage = 'Won' AND d.created_at >= start_date), 0) AS total_won_value
      FROM leads l
      LEFT JOIN deals d ON d.lead_id = l.id
      WHERE l.source IN ('Upwork', 'Recruitment', 'B2B')
      GROUP BY l.source
    ) stats ON stats.source = streams.source
  ) final_result;

  SELECT json_agg(json_build_object(
    'source', source,
    'active_leads', coalesce(active_leads_count, 0),
    'won_deals', coalesce(won_deals_count, 0),
    'total_value', coalesce(total_won_value, 0)
  ))
  INTO personal_revenue_by_stream
  FROM (
    SELECT streams.source, stats.active_leads_count, stats.won_deals_count, stats.total_won_value
    FROM (VALUES ('Upwork'), ('Recruitment'), ('B2B')) AS streams(source)
    LEFT JOIN (
      SELECT 
        l.source,
        count(*) FILTER (WHERE l.status IN ('Applied', 'Conversation', 'Interview') AND l.created_at >= start_date) AS active_leads_count,
        count(d.id) FILTER (WHERE d.stage = 'Won' AND d.created_at >= start_date) AS won_deals_count,
        coalesce(sum(d.value) FILTER (WHERE d.stage = 'Won' AND d.created_at >= start_date), 0) AS total_won_value
      FROM leads l
      LEFT JOIN deals d ON d.lead_id = l.id
      WHERE l.source IN ('Upwork', 'Recruitment', 'B2B')
      AND l.owner_id = auth.uid()
      GROUP BY l.source
    ) stats ON stats.source = streams.source
  ) final_result;

  -- 6. Won Deals by Industry
  SELECT json_agg(json_build_object('industry', industry, 'count', cnt, 'value', total_won_value))
  INTO won_deals_by_industry
  FROM (
    SELECT 
      COALESCE(l.industry, 'Unknown') as industry,
      count(d.id) FILTER (WHERE d.stage = 'Won') AS cnt,
      coalesce(sum(d.value) FILTER (WHERE d.stage = 'Won'), 0) AS total_won_value
    FROM leads l
    LEFT JOIN deals d ON d.lead_id = l.id
    WHERE d.created_at >= start_date
    GROUP BY l.industry
  ) as deals_grouped_by_industry;

  SELECT json_agg(json_build_object('industry', industry, 'count', cnt, 'value', total_won_value))
  INTO personal_won_deals_by_industry
  FROM (
    SELECT 
      COALESCE(l.industry, 'Unknown') as industry,
      count(d.id) FILTER (WHERE d.stage = 'Won') AS cnt,
      coalesce(sum(d.value) FILTER (WHERE d.stage = 'Won'), 0) AS total_won_value
    FROM leads l
    LEFT JOIN deals d ON d.lead_id = l.id
    WHERE d.created_at >= start_date
    AND d.owner_id = auth.uid()
    GROUP BY l.industry
  ) as deals_grouped_by_industry;

  -- 7. Leads by Industry
  SELECT json_agg(json_build_object('industry', industry, 'count', cnt))
  INTO leads_by_industry
  FROM (
    SELECT
      COALESCE(l.industry, 'Unknown') as industry,
      count(*) FILTER (WHERE l.status IN ('Applied', 'Conversation', 'Interview')) AS cnt
    FROM leads l
    WHERE l.created_at >= start_date
    GROUP BY l.industry
  ) as grouped_leads_by_industry;
  
  SELECT json_agg(json_build_object('industry', industry, 'count', cnt))
  INTO personal_leads_by_industry
  FROM (
    SELECT
      COALESCE(l.industry, 'Unknown') as industry,
      count(*) FILTER (WHERE l.status IN ('Applied', 'Conversation', 'Interview')) AS cnt
    FROM leads l
    WHERE l.created_at >= start_date
    AND l.owner_id = auth.uid()
    GROUP BY l.industry
  ) as grouped_leads_by_industry;
  
  -- 8. Team Performance: Leads
  SELECT json_agg(json_build_object(
    'rep_id', p.id,
    'rep_name', p.full_name,
    'leads_handled', coalesce(lead_counts.cnt, 0)
  ))
  INTO team_leads
  FROM profiles p
  LEFT JOIN (
    SELECT owner_id, count(*) AS cnt
    FROM leads
    WHERE created_at >= start_date
    GROUP BY owner_id
  ) lead_counts ON p.id = lead_counts.owner_id
  WHERE p.role = 'sales_rep';

  -- 9. Team Performance: Deals
  SELECT json_agg(json_build_object(
    'rep_id', p.id,
    'rep_name', p.full_name,
    'deals_closed', coalesce(deal_counts.cnt, 0),
    'total_value', coalesce(deal_counts.total_value, 0)
  ))
  INTO team_deals
  FROM profiles p
  LEFT JOIN (
    SELECT d.owner_id, count(*) AS cnt, coalesce(sum(d.value), 0) AS total_value
    FROM deals d
    WHERE d.stage = 'Won' AND d.created_at >= start_date
    GROUP BY d.owner_id
  ) deal_counts ON p.id = deal_counts.owner_id
  WHERE p.role = 'sales_rep';

  -- 10. Team Performance: Response Time
  SELECT json_agg(json_build_object(
    'rep_id', p.id,
    'rep_name', p.full_name,
    'avg_response_hours', coalesce(avg_rt.avg_hours, 0)
  ))
  INTO team_response
  FROM profiles p
  LEFT JOIN (
    SELECT owner_id, round(avg(response_time_hours)) AS avg_hours
    FROM leads
    WHERE response_time_hours IS NOT NULL AND created_at >= start_date
    GROUP BY owner_id
  ) avg_rt ON p.id = avg_rt.owner_id
  WHERE p.role = 'sales_rep';

  RETURN json_build_object(
    'active_leads', coalesce(active_leads, '[]'::json),
    'personal_active_leads', coalesce(personal_active_leads, '[]'::json),
    'deal_pipeline', coalesce(deal_pipeline, '[]'::json),
    'personal_deal_pipeline', coalesce(personal_deal_pipeline, '[]'::json),
    'task_summary', coalesce(task_summary, '{}'::json),
    'personal_task_summary', coalesce(personal_task_summary, '{}'::json),
    'revenue_by_stream', coalesce(revenue_by_stream, '[]'::json),
    'won_deals_by_industry', coalesce(won_deals_by_industry, '[]'::json),
    'leads_by_industry', coalesce(leads_by_industry, '[]'::json),
    'team_leads', coalesce(team_leads, '[]'::json),
    'team_deals', coalesce(team_deals, '[]'::json),
    'team_response', coalesce(team_response, '[]'::json)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  active_leads JSON;
  deal_pipeline JSON;
  task_summary JSON;
  personal_task_summary JSON;
  revenue_by_stream JSON;
  won_deals_by_industry JSON;
  leads_by_industry JSON;
  team_leads JSON;
  team_deals JSON;
  team_response JSON;
BEGIN
  -- Active Leads by Source (FIXED)
  SELECT json_agg(
    json_build_object('source', source, 'count', cnt)
  )
  INTO active_leads
  FROM (
    SELECT source, count(*) AS cnt
    FROM leads
    WHERE status IN ('Applied', 'Conversation', 'Interview')
    GROUP BY source
  ) AS grouped_leads;

  -- Deal Pipeline (FIXED)
  SELECT json_agg(
    json_build_object('stage', stage, 'count', cnt, 'value', total_value)
  )
  INTO deal_pipeline
  FROM (
    SELECT 
      stage, 
      count(*) AS cnt,
      coalesce(sum(value), 0) AS total_value
    FROM deals
    WHERE stage NOT IN ('Won', 'Lost')
    GROUP BY stage
  ) AS grouped_deals;

  -- Task Summary (no change needed)
  SELECT json_build_object(
    'overdue', count(*) FILTER (WHERE due_date < CURRENT_DATE AND status = 'pending'),
    'due_today', count(*) FILTER (WHERE due_date = CURRENT_DATE AND status = 'pending'),
    'followups_due_today', count(*) FILTER (WHERE due_date = CURRENT_DATE AND type = 'Email' AND status = 'pending'),
    'meetings_due_today', count(*) FILTER (WHERE due_date = CURRENT_DATE AND type = 'Call' AND status = 'pending')
  )
  INTO task_summary
  FROM tasks;
  
  -- Task Summary (no change needed)
  SELECT json_build_object(
    'overdue', count(*) FILTER (WHERE due_date < CURRENT_DATE AND owner_id = auth.uid() AND status = 'pending'),
    'due_today', count(*) FILTER (WHERE due_date = CURRENT_DATE AND owner_id = auth.uid() AND status = 'pending'),
    'followups_due_today', count(*) FILTER (WHERE due_date = CURRENT_DATE AND owner_id = auth.uid() AND type = 'Email' AND status = 'pending'),
    'meetings_due_today', count(*) FILTER (WHERE due_date = CURRENT_DATE AND owner_id = auth.uid() AND type = 'Call' AND status = 'pending')
  )
  INTO personal_task_summary
  FROM tasks;

  -- Revenue by Stream (FIXED)
  SELECT json_agg(
    json_build_object(
      'source', source,
      'active_leads', coalesce(active_leads_count, 0),
      'won_deals', coalesce(won_deals_count, 0),
      'total_value', coalesce(total_won_value, 0)
    )
  )
  INTO revenue_by_stream
  FROM (
    SELECT 
      streams.source,
      stats.active_leads_count,
      stats.won_deals_count,
      stats.total_won_value
    FROM (
      VALUES ('Upwork'), ('Recruitment'), ('B2B')
    ) AS streams(source)
    LEFT JOIN (
      SELECT 
        l.source,
        count(*) FILTER (WHERE l.status IN ('Applied', 'Conversation', 'Interview')) AS active_leads_count,
        count(d.id) FILTER (WHERE d.stage = 'Won') AS won_deals_count,
        coalesce(sum(d.value) FILTER (WHERE d.stage = 'Won'), 0) AS total_won_value
      FROM leads l
      LEFT JOIN deals d ON d.lead_id = l.id
      WHERE l.source IN ('Upwork', 'Recruitment', 'B2B')
      GROUP BY l.source
    ) stats ON stats.source = streams.source
  ) final_result;

  -- Won deals by industry
  SELECT json_agg(json_build_object(
    'industry', industry,
    'count', cnt,
    'value', total_won_value
  ))
  INTO won_deals_by_industry
  FROM (
    SELECT 
      COALESCE(l.industry, 'Unknown') as industry,
      count(d.id) FILTER (WHERE d.stage = 'Won') AS cnt,
      coalesce(sum(d.value) FILTER (WHERE d.stage = 'Won'), 0) AS total_won_value
    FROM leads l
    LEFT JOIN deals d ON d.lead_id = l.id
    GROUP BY l.industry
  ) as deals_grouped_by_industry;

  -- Leads by Industry
  SELECT json_agg(json_build_object(
    'industry', industry,
    'count', cnt
  ))
  INTO leads_by_industry
  FROM (
    SELECT
      COALESCE(l.industry, 'Unknown') as industry,
      count(*) FILTER (WHERE l.status IN ('Applied', 'Conversation', 'Interview')) AS cnt
    FROM leads l
    GROUP BY l.industry
  ) as grouped_leads_by_industry;
  
  -- Team Performance: Leads handled per rep
  SELECT json_agg(json_build_object(
    'rep_id', p.id,
    'rep_name', p.full_name,
    'leads_handled', coalesce(lead_counts.cnt, 0)
  ))
  INTO team_leads
  FROM profiles p
  LEFT JOIN (
    SELECT owner_id, count(*) AS cnt
    FROM leads
    GROUP BY owner_id
  ) lead_counts ON p.id = lead_counts.owner_id
  WHERE p.role = 'sales_rep';

  -- Team Performance: Deals closed per rep
  SELECT json_agg(json_build_object(
    'rep_id', p.id,
    'rep_name', p.full_name,
    'deals_closed', coalesce(deal_counts.cnt, 0),
    'total_value', coalesce(deal_counts.total_value, 0)
  ))
  INTO team_deals
  FROM profiles p
  LEFT JOIN (
    SELECT 
      d.owner_id, 
      count(*) AS cnt,
      coalesce(sum(d.value), 0) AS total_value
    FROM deals d
    WHERE d.stage = 'Won'
    GROUP BY d.owner_id
  ) deal_counts ON p.id = deal_counts.owner_id
  WHERE p.role = 'sales_rep';

  -- Team Performance: Avg response time (manual input for MVP)
  -- Assumes you add `response_time_hours` to leads table
  SELECT json_agg(json_build_object(
    'rep_id', p.id,
    'rep_name', p.full_name,
    'avg_response_hours', coalesce(avg_rt.avg_hours, 0)
  ))
  INTO team_response
  FROM profiles p
  LEFT JOIN (
    SELECT 
      owner_id, 
      round(avg(response_time_hours)) AS avg_hours
    FROM leads
    WHERE response_time_hours IS NOT NULL
    GROUP BY owner_id
  ) avg_rt ON p.id = avg_rt.owner_id
  WHERE p.role = 'sales_rep';

  RETURN json_build_object(
    'active_leads', coalesce(active_leads, '[]'::json),
    'deal_pipeline', coalesce(deal_pipeline, '[]'::json),
    'task_summary', coalesce(task_summary, '{}'::json),
    'personal_task_summary', coalesce(personal_task_summary, '{}'::json),
    'revenue_by_stream', coalesce(revenue_by_stream, '[]'::json),
    'won_deals_by_industry', coalesce(won_deals_by_industry, '[]'::json),
    'leads_by_industry', coalesce(leads_by_industry, '[]'::json),
    'team_leads', coalesce(team_leads, '[]'::json),
    'team_deals', coalesce(team_deals, '[]'::json),
    'team_response', coalesce(team_response, '[]'::json)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_deal_activity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$DECLARE
  v_old_stage TEXT;
  v_new_stage TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      auth.uid(),
      'deal_created',
      'deal',
      NEW.id,
      jsonb_build_object('deal', row_to_json(NEW)),
      null
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_stage := OLD.stage;
    v_new_stage := NEW.stage;

    -- Stage changed
    IF v_old_stage != v_new_stage THEN
      PERFORM log_activity(
        auth.uid(),
        CASE
          WHEN v_new_stage = 'Won' THEN 'deal_won'
          WHEN v_new_stage = 'Lost' THEN 'deal_lost'
          ELSE 'deal_stage_changed'
        END,
        'deal',
        NEW.id,
        jsonb_build_object(
          'old_stage', v_old_stage,
          'new_stage', v_new_stage
        ),
        null
      );
    ELSE
      -- Other updates
      PERFORM log_activity(
        auth.uid(),
        'deal_updated',
        'deal',
        NEW.id,
        jsonb_build_object(
          'changed_fields', (
            SELECT jsonb_object_agg(key, value)
            FROM jsonb_each(row_to_json(NEW)::jsonb - 'id' - 'created_at' - 'updated_at')
            WHERE value != (row_to_json(OLD)::jsonb - 'id' - 'created_at' - 'updated_at')->key
          )
        ),
        null
      );
    END IF;
  END IF;

  RETURN NEW;
END;$function$
;

drop trigger if exists "objects_delete_delete_prefix" on "storage"."objects";

drop trigger if exists "objects_insert_create_prefix" on "storage"."objects";

drop trigger if exists "objects_update_create_prefix" on "storage"."objects";

drop trigger if exists "prefixes_create_hierarchy" on "storage"."prefixes";

drop trigger if exists "prefixes_delete_hierarchy" on "storage"."prefixes";

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


