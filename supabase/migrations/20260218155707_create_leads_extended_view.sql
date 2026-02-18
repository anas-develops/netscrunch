-- 1. Create the View
CREATE OR REPLACE VIEW public.leads_extended AS
SELECT
  l.id,
  l.name,
  l.company,
  l.source,
  l.status,
  l.prospect_id,
  l.owner_id,
  l.created_at,
  -- Prospect Columns for Filtering
  p.city,
  p.state,
  p.job_title,
  p.zip_code,
  p.email,
  p.phone,
  p.linked_in_url,
  -- Owner Column (Flattened from relationship)
  o.full_name AS owner_full_name
FROM leads l
LEFT JOIN prospects p ON l.prospect_id = p.id
LEFT JOIN profiles o ON l.owner_id = o.id;

-- 2. Add Indexes for Performance
-- Crucial for filtering speed on the new columns
CREATE INDEX IF NOT EXISTS idx_leads_prospect_id ON leads(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospects_city ON prospects(city);
CREATE INDEX IF NOT EXISTS idx_prospects_state ON prospects(state);
CREATE INDEX IF NOT EXISTS idx_prospects_job_title ON prospects(job_title);
CREATE INDEX IF NOT EXISTS idx_prospects_zip_code ON prospects(zip_code);