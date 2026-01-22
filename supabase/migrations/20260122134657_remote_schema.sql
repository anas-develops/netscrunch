


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_lead_with_context"("p_user_id" "uuid", "p_name" "text", "p_company" "text", "p_email" "text", "p_linkedin_url" "text", "p_prospect_id" "uuid", "p_department" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Set the JWT claims so auth.uid() works in triggers
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_user_id::TEXT,
      'role', 'authenticated'
    )::TEXT,
    true
  );

  -- Now insert the lead — trigger will see auth.uid() = p_user_id
  INSERT INTO leads (
    name,
    company,
    email,
    linkedin_url,
    upwork_id,
    source,
    industry,
    description,
    prospect_id,
    owner_id,
    department,
    status
  ) VALUES (
    p_name,
    p_company,
    p_email,
    p_linkedin_url,
    '',
    'B2B',
    '',
    '',
    p_prospect_id,
    p_user_id,
    p_department,
    'Warmed-Up'
  );
END;
$$;


ALTER FUNCTION "public"."create_lead_with_context"("p_user_id" "uuid", "p_name" "text", "p_company" "text", "p_email" "text", "p_linkedin_url" "text", "p_prospect_id" "uuid", "p_department" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."department"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT department FROM public.profiles WHERE id = auth.uid()
$$;


ALTER FUNCTION "public"."department"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_metrics"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  active_leads JSON;
  deal_pipeline JSON;
  task_summary JSON;
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
    'due_today', count(*) FILTER (WHERE due_date = CURRENT_DATE AND status = 'pending')
  )
  INTO task_summary
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
    'revenue_by_stream', coalesce(revenue_by_stream, '[]'::json),
    'won_deals_by_industry', coalesce(won_deals_by_industry, '[]'::json),
    'leads_by_industry', coalesce(leads_by_industry, '[]'::json),
    'team_leads', coalesce(team_leads, '[]'::json),
    'team_deals', coalesce(team_deals, '[]'::json),
    'team_response', coalesce(team_response, '[]'::json)
  );
END;
$$;


ALTER FUNCTION "public"."get_dashboard_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_task_reminders"() RETURNS TABLE("task_id" "uuid", "task_type" "text", "task_description" "text", "due_date" "date", "owner_id" "uuid", "owner_email" "text", "owner_full_name" "text", "lead_id" "uuid", "lead_name" "text", "lead_company" "text", "deal_id" "uuid", "deal_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
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
    AND t.due_date <= CURRENT_DATE;
END;
$$;


ALTER FUNCTION "public"."get_pending_task_reminders"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "due_date" "date",
    "lead_id" "uuid",
    "deal_id" "uuid",
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "cancel_reason" "text",
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "tasks_type_check" CHECK (("type" = ANY (ARRAY['Call'::"text", 'Email'::"text", 'Message'::"text", 'Proposal'::"text", 'Follow-up'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_tasks"() RETURNS SETOF "public"."tasks"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT *
  FROM tasks
  WHERE completed = false
    AND due_date <= CURRENT_DATE;
$$;


ALTER FUNCTION "public"."get_pending_tasks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_activity"("p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.activity_log (
    user_id,
    action_type,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_user_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
END;
$$;


ALTER FUNCTION "public"."log_activity"("p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_activity"("p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_description" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.activity_log (
    user_id,
    action_type,
    entity_type,
    entity_id,
    metadata,
    description
  ) VALUES (
    p_user_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_metadata,
    p_description
  );
END;
$$;


ALTER FUNCTION "public"."log_activity"("p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_automation_activity"("p_task_id" "uuid", "p_recipient_email" "text", "p_secret" "text", "p_entity_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_system_user_id UUID := 'a65e401c-708a-4dc6-a868-f7aa5811c0fe'::UUID;
BEGIN
  IF p_secret != 'your_strong_secret_here' THEN
    RAISE EXCEPTION 'Invalid secret';
  END IF;

  -- Ensure system user exists
  INSERT INTO public.profiles (id, full_name, role, department)
  VALUES (v_system_user_id, 'System Automation', 'admin', 'B2B')
  ON CONFLICT (id) DO NOTHING;

  PERFORM log_activity(
    v_system_user_id,
    'task_reminder_sent',
    'task',
    p_task_id,
    jsonb_build_object(
      'automation', 'make_com_daily_reminder',
      'recipient_email', p_recipient_email,
      'related_entity_id', p_entity_id
    ),
    'Daily reminder email sent'
  );

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."log_automation_activity"("p_task_id" "uuid", "p_recipient_email" "text", "p_secret" "text", "p_entity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_deal_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
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
            WHERE value != (row_to_json(OLD)::jsonb - 'id' - 'created_at' - 'updated_at')->>key
          )
        ),
        null
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_deal_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_lead_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_old_status TEXT;
  v_new_status TEXT;
  v_old_owner UUID;
  v_new_owner UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      auth.uid(),
      'lead_created',
      'lead',
      NEW.id,
      jsonb_build_object('lead', row_to_json(NEW)),
      null
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_status := OLD.status;
    v_new_status := NEW.status;
    v_old_owner := OLD.owner_id;
    v_new_owner := auth.uid();

    -- Status changed
    IF v_old_status != v_new_status THEN
      PERFORM log_activity(
        auth.uid(),
        'lead_status_changed',
        'lead',
        NEW.id,
        jsonb_build_object(
          'old_status', v_old_status,
          'new_status', v_new_status
        ),
        null
      );
    END IF;

    -- Reassigned
    IF v_old_owner != v_new_owner THEN
      PERFORM log_activity(
        auth.uid(),
        'lead_reassigned',
        'lead',
        NEW.id,
        jsonb_build_object(
          'old_owner', v_old_owner,
          'new_owner', v_new_owner
        ),
        null
      );
    END IF;

    -- Other updates
    IF NOT (
      v_old_status != v_new_status OR
      v_old_owner != v_new_owner
    ) THEN
      PERFORM log_activity(
        auth.uid(),
        'lead_updated',
        'lead',
        NEW.id,
        jsonb_build_object(
          'changed_fields', (
            SELECT jsonb_object_agg(key, value)
            FROM jsonb_each(row_to_json(NEW)::jsonb - 'id' - 'created_at' - 'updated_at')
            WHERE value != (row_to_json(OLD)::jsonb - 'id' - 'created_at' - 'updated_at')->>key
          )
        ),
        null
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_lead_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_task_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      auth.uid(),
      'task_created',
      'task',
      NEW.id,
      jsonb_build_object('task', row_to_json(NEW)),
      null
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_status := OLD.status;
    v_new_status := NEW.status;

    -- Status changed
    IF v_old_status != v_new_status THEN
      PERFORM log_activity(
        auth.uid(),
        CASE
          WHEN v_new_status = 'completed' THEN 'task_completed'
          WHEN v_new_status = 'cancelled' THEN 'task_cancelled'
          ELSE 'task_updated'
        END,
        'task',
        NEW.id,
        jsonb_build_object(
          'old_status', v_old_status,
          'new_status', v_new_status
        ),
        null
      );
    ELSE
      -- Other updates
      PERFORM log_activity(
        auth.uid(),
        'task_updated',
        'task',
        NEW.id,
        jsonb_build_object(
          'changed_fields', (
            SELECT jsonb_object_agg(key, value)
            FROM jsonb_each(row_to_json(NEW)::jsonb - 'id' - 'created_at' - 'updated_at')
            WHERE value != (row_to_json(OLD)::jsonb - 'id' - 'created_at' - 'updated_at')->>key
          )
        ),
        null
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_task_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;


ALTER FUNCTION "public"."role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_request_user"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Set the JWT claims so auth.uid() works
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', user_id::TEXT,
      'role', 'authenticated'
    )::TEXT,
    true
  );
END;
$$;


ALTER FUNCTION "public"."set_request_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_deal_denormalized_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_owner_name TEXT;
  v_lead_name TEXT;
  v_lead_company TEXT;
BEGIN
  -- Fetch owner name from profiles
  SELECT full_name INTO v_owner_name
  FROM public.profiles
  WHERE id = NEW.owner_id;

  -- Fetch lead data if lead_id exists
  IF NEW.lead_id IS NOT NULL THEN
    SELECT name, company, source
    INTO v_lead_name, v_lead_company
    FROM public.leads
    WHERE id = NEW.lead_id;
  END IF;

  -- Set denormalized fields
  NEW.owner_name := v_owner_name;
  NEW.lead_name := v_lead_name;
  NEW.lead_company := v_lead_company;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_deal_denormalized_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lead_status_with_context"("p_user_id" "uuid", "p_lead_ids" "uuid"[], "p_new_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Set JWT claims so auth.uid() returns p_user_id in triggers
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_user_id::TEXT,
      'role', 'authenticated'
    )::TEXT,
    true
  );

  -- Update leads — triggers will see auth.uid() = p_user_id
  UPDATE leads
  SET status = p_new_status
  WHERE id = ANY(p_lead_ids);
END;
$$;


ALTER FUNCTION "public"."update_lead_status_with_context"("p_user_id" "uuid", "p_lead_ids" "uuid"[], "p_new_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_prospect_status_with_context"("p_user_id" "uuid", "p_prospect_ids" "uuid"[], "p_new_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Set JWT claims so auth.uid() returns p_user_id in triggers
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_user_id::TEXT,
      'role', 'authenticated'
    )::TEXT,
    true
  );

  -- Update prospects — triggers will now see auth.uid() = p_user_id
  UPDATE prospects
  SET status = p_new_status
  WHERE id = ANY(p_prospect_ids);
END;
$$;


ALTER FUNCTION "public"."update_prospect_status_with_context"("p_user_id" "uuid", "p_prospect_ids" "uuid"[], "p_new_status" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    CONSTRAINT "activity_log_action_type_check" CHECK (("action_type" = ANY (ARRAY['lead_created'::"text", 'lead_updated'::"text", 'lead_reassigned'::"text", 'lead_status_changed'::"text", 'deal_created'::"text", 'deal_updated'::"text", 'deal_stage_changed'::"text", 'deal_won'::"text", 'deal_lost'::"text", 'task_created'::"text", 'task_updated'::"text", 'task_completed'::"text", 'task_cancelled'::"text", 'task_overdue'::"text", 'note_added'::"text", 'manual_activity'::"text", 'task_reminder_sent'::"text"]))),
    CONSTRAINT "activity_log_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['lead'::"text", 'deal'::"text", 'task'::"text"])))
);


ALTER TABLE "public"."activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lead_id" "uuid",
    "name" "text" NOT NULL,
    "value" numeric,
    "close_date" "date",
    "stage" "text",
    "notes" "text",
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "owner_name" "text",
    "lead_name" "text",
    "lead_company" "text",
    CONSTRAINT "deals_stage_check" CHECK (("stage" = ANY (ARRAY['Prospecting'::"text", 'Qualification'::"text", 'Proposal'::"text", 'Negotiation'::"text", 'Won'::"text", 'Lost'::"text"])))
);


ALTER TABLE "public"."deals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."intended_customer_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tag_color" "text" NOT NULL
);


ALTER TABLE "public"."intended_customer_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "company" "text",
    "email" "text",
    "upwork_id" "text",
    "linkedin_url" "text",
    "source" "text",
    "industry" "text",
    "description" "text",
    "status" "text",
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "department" "text",
    "response_time_hours" integer,
    "prospect_id" "uuid",
    CONSTRAINT "leads_response_time_hours_check" CHECK (("response_time_hours" >= 0)),
    CONSTRAINT "leads_source_check" CHECK (("source" = ANY (ARRAY['Upwork'::"text", 'Freelancer'::"text", 'Recruitment'::"text", 'B2B'::"text", 'Referral'::"text"]))),
    CONSTRAINT "leads_status_check" CHECK (("status" = ANY (ARRAY['Warmed-Up'::"text", 'Negotiating'::"text", 'Service Initiated'::"text", 'Service Declined'::"text"])))
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "department" "text",
    "full_name" "text",
    CONSTRAINT "profiles_department_check" CHECK (("department" = ANY (ARRAY['Upwork'::"text", 'Recruitment'::"text", 'B2B'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'sales_rep'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prospects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "tagged_icp_id" "uuid" NOT NULL,
    "company" "text",
    "job_title" "text",
    "phone" "text",
    "email" "text" NOT NULL,
    "website" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "linked_in_url" "text",
    "company_jobs_board_url" "text",
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" NOT NULL,
    CONSTRAINT "prospects_email_check" CHECK (("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")),
    CONSTRAINT "prospects_status_check" CHECK (("status" = ANY (ARRAY['Not Contacted'::"text", 'Not Qualified'::"text", 'Pre-Qualified'::"text", 'Lost Lead'::"text", 'Junk Lead'::"text", 'Contacted'::"text", 'Contacted in Future'::"text", 'Attempted to Contact'::"text"])))
);


ALTER TABLE "public"."prospects" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."intended_customer_profiles"
    ADD CONSTRAINT "intended_customer_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prospects"
    ADD CONSTRAINT "prospects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "trigger_log_deal_activity" AFTER INSERT OR UPDATE ON "public"."deals" FOR EACH ROW EXECUTE FUNCTION "public"."log_deal_activity"();



CREATE OR REPLACE TRIGGER "trigger_log_lead_activity" AFTER INSERT OR UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."log_lead_activity"();



CREATE OR REPLACE TRIGGER "trigger_log_task_activity" AFTER INSERT OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."log_task_activity"();



CREATE OR REPLACE TRIGGER "trigger_update_deal_denormalized_fields" BEFORE INSERT ON "public"."deals" FOR EACH ROW EXECUTE FUNCTION "public"."update_deal_denormalized_fields"();



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id");



ALTER TABLE ONLY "public"."deals"
    ADD CONSTRAINT "deals_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "fk_leads_prospect_id" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id");



ALTER TABLE ONLY "public"."intended_customer_profiles"
    ADD CONSTRAINT "intended_customer_profiles_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prospects"
    ADD CONSTRAINT "prospects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."prospects"
    ADD CONSTRAINT "prospects_tagged_icp_id_fkey" FOREIGN KEY ("tagged_icp_id") REFERENCES "public"."intended_customer_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "Admin can do anything" ON "public"."leads" TO "authenticated" USING ((("public"."role"() = 'admin'::"text") AND ("auth"."uid"() IS NOT NULL))) WITH CHECK ((("public"."role"() = 'admin'::"text") AND ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "Admins can do anything" ON "public"."deals" FOR SELECT TO "authenticated" USING (("public"."role"() = 'admin'::"text"));



CREATE POLICY "Admins full access to activity log" ON "public"."activity_log" TO "authenticated" USING (("public"."role"() = 'admin'::"text")) WITH CHECK (("public"."role"() = 'admin'::"text"));



CREATE POLICY "Admins full access to tasks" ON "public"."tasks" TO "authenticated" USING (("public"."role"() = 'admin'::"text")) WITH CHECK (("public"."role"() = 'admin'::"text"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."profiles" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "id") AND ("role" <> 'admin'::"text")));



CREATE POLICY "Enable read for all authenticated users" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Manager can access leads belonging to their department" ON "public"."leads" USING ((("public"."role"() = 'manager'::"text") AND ("department" = "public"."department"()))) WITH CHECK ((("public"."role"() = 'manager'::"text") AND ("department" = "public"."department"())));



CREATE POLICY "Managers access department deals" ON "public"."deals" TO "authenticated" USING ((("public"."role"() = 'manager'::"text") AND ((("lead_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "deals"."owner_id") AND ("p"."department" = "public"."department"()))))) OR (("lead_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."leads" "l"
  WHERE (("l"."id" = "deals"."lead_id") AND ("l"."department" = "public"."department"())))))))) WITH CHECK ((("public"."role"() = 'manager'::"text") AND ((("lead_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "deals"."owner_id") AND ("p"."department" = "public"."department"()))))) OR (("lead_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."leads" "l"
  WHERE (("l"."id" = "deals"."lead_id") AND ("l"."department" = "public"."department"()))))))));



CREATE POLICY "Managers manage department tasks" ON "public"."tasks" TO "authenticated" USING ((("public"."role"() = 'manager'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "tasks"."owner_id") AND ("p"."department" = "public"."department"())))))) WITH CHECK ((("public"."role"() = 'manager'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "tasks"."owner_id") AND ("p"."department" = "public"."department"()))))));



CREATE POLICY "Managers see department activity" ON "public"."activity_log" TO "authenticated" USING ((("public"."role"() = 'manager'::"text") AND ((EXISTS ( SELECT 1
   FROM "public"."leads" "l"
  WHERE (("l"."id" = "activity_log"."entity_id") AND ("l"."department" = "public"."department"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."deals" "d"
     JOIN "public"."leads" "l" ON (("d"."lead_id" = "l"."id")))
  WHERE (("d"."id" = "activity_log"."entity_id") AND ("l"."department" = "public"."department"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."tasks" "t"
     JOIN "public"."profiles" "p" ON (("t"."owner_id" = "p"."id")))
  WHERE (("t"."id" = "activity_log"."entity_id") AND ("p"."department" = "public"."department"()))))))) WITH CHECK ((("public"."role"() = 'manager'::"text") AND ((EXISTS ( SELECT 1
   FROM "public"."leads" "l"
  WHERE (("l"."id" = "activity_log"."entity_id") AND ("l"."department" = "public"."department"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."deals" "d"
     JOIN "public"."leads" "l" ON (("d"."lead_id" = "l"."id")))
  WHERE (("d"."id" = "activity_log"."entity_id") AND ("l"."department" = "public"."department"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."tasks" "t"
     JOIN "public"."profiles" "p" ON (("t"."owner_id" = "p"."id")))
  WHERE (("t"."id" = "activity_log"."entity_id") AND ("p"."department" = "public"."department"())))))));



CREATE POLICY "Only system can insert activity log" ON "public"."activity_log" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "Sales rep can edit/create/view their own leads" ON "public"."leads" TO "authenticated" USING ((("public"."role"() = 'sales_rep'::"text") AND ("auth"."uid"() = "owner_id") AND ("public"."department"() = "department"))) WITH CHECK ((("public"."role"() = 'sales_rep'::"text") AND ("auth"."uid"() = "owner_id") AND ("public"."department"() = "department")));



CREATE POLICY "Sales reps can only manage their own tasks and can view their d" ON "public"."tasks" TO "authenticated" USING (((("public"."role"() = 'sales_rep'::"text") AND ("owner_id" = "auth"."uid"())) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "tasks"."owner_id") AND ("p"."department" = "public"."department"())))))) WITH CHECK ((("public"."role"() = 'sales_rep'::"text") AND ("owner_id" = "auth"."uid"())));



CREATE POLICY "Sales reps manage own deals" ON "public"."deals" TO "authenticated" USING ((("public"."role"() = 'sales_rep'::"text") AND ((("lead_id" IS NULL) AND ("owner_id" = "auth"."uid"())) OR (("lead_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."leads" "l"
  WHERE (("l"."id" = "deals"."lead_id") AND ("l"."owner_id" = "auth"."uid"()) AND ("l"."department" = "public"."department"())))))))) WITH CHECK ((("public"."role"() = 'sales_rep'::"text") AND ((("lead_id" IS NULL) AND ("owner_id" = "auth"."uid"())) OR (("lead_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."leads" "l"
  WHERE (("l"."id" = "deals"."lead_id") AND ("l"."owner_id" = "auth"."uid"()) AND ("l"."department" = "public"."department"()))))))));



ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_lead_with_context"("p_user_id" "uuid", "p_name" "text", "p_company" "text", "p_email" "text", "p_linkedin_url" "text", "p_prospect_id" "uuid", "p_department" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_lead_with_context"("p_user_id" "uuid", "p_name" "text", "p_company" "text", "p_email" "text", "p_linkedin_url" "text", "p_prospect_id" "uuid", "p_department" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_lead_with_context"("p_user_id" "uuid", "p_name" "text", "p_company" "text", "p_email" "text", "p_linkedin_url" "text", "p_prospect_id" "uuid", "p_department" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."department"() TO "anon";
GRANT ALL ON FUNCTION "public"."department"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."department"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_task_reminders"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_task_reminders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_task_reminders"() TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_tasks"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_tasks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_activity"("p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_activity"("p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_activity"("p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_activity"("p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_activity"("p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_activity"("p_user_id" "uuid", "p_action_type" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb", "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_automation_activity"("p_task_id" "uuid", "p_recipient_email" "text", "p_secret" "text", "p_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."log_automation_activity"("p_task_id" "uuid", "p_recipient_email" "text", "p_secret" "text", "p_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_automation_activity"("p_task_id" "uuid", "p_recipient_email" "text", "p_secret" "text", "p_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_deal_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_deal_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_deal_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_lead_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_lead_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_lead_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_task_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_task_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_task_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."role"() TO "anon";
GRANT ALL ON FUNCTION "public"."role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_request_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_request_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_request_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_deal_denormalized_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_deal_denormalized_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_deal_denormalized_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lead_status_with_context"("p_user_id" "uuid", "p_lead_ids" "uuid"[], "p_new_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_lead_status_with_context"("p_user_id" "uuid", "p_lead_ids" "uuid"[], "p_new_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lead_status_with_context"("p_user_id" "uuid", "p_lead_ids" "uuid"[], "p_new_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_prospect_status_with_context"("p_user_id" "uuid", "p_prospect_ids" "uuid"[], "p_new_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_prospect_status_with_context"("p_user_id" "uuid", "p_prospect_ids" "uuid"[], "p_new_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_prospect_status_with_context"("p_user_id" "uuid", "p_prospect_ids" "uuid"[], "p_new_status" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."activity_log" TO "anon";
GRANT ALL ON TABLE "public"."activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."deals" TO "anon";
GRANT ALL ON TABLE "public"."deals" TO "authenticated";
GRANT ALL ON TABLE "public"."deals" TO "service_role";



GRANT ALL ON TABLE "public"."intended_customer_profiles" TO "anon";
GRANT ALL ON TABLE "public"."intended_customer_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."intended_customer_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."prospects" TO "anon";
GRANT ALL ON TABLE "public"."prospects" TO "authenticated";
GRANT ALL ON TABLE "public"."prospects" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


