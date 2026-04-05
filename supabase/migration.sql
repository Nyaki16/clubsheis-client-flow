-- ClubSheIs Client Flow System — Database Setup
-- Run this in your Supabase SQL Editor

-- Clients table
CREATE TABLE IF NOT EXISTS flow_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  website TEXT DEFAULT '',
  socials TEXT DEFAULT '',
  needs TEXT DEFAULT '',
  budget_range TEXT DEFAULT '',
  lead_status TEXT DEFAULT 'new',
  package TEXT DEFAULT '',
  current_stage TEXT DEFAULT 'discovery',
  contract_type TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Substep completions
CREATE TABLE IF NOT EXISTS flow_stage_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES flow_clients(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  substep_index INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_by TEXT DEFAULT '',
  completed_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  UNIQUE(client_id, stage_key, substep_index)
);

-- Stage data fields (key-value per stage per client)
CREATE TABLE IF NOT EXISTS flow_stage_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES flow_clients(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_value TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, stage_key, field_key)
);

-- Enable Row Level Security (public access for team — no auth required)
ALTER TABLE flow_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_stage_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_stage_data ENABLE ROW LEVEL SECURITY;

-- Allow full access (team tool, no auth)
CREATE POLICY "Allow all on flow_clients" ON flow_clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on flow_stage_completions" ON flow_stage_completions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on flow_stage_data" ON flow_stage_data FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_completions_client ON flow_stage_completions(client_id);
CREATE INDEX IF NOT EXISTS idx_stage_data_client ON flow_stage_data(client_id);
CREATE INDEX IF NOT EXISTS idx_completions_lookup ON flow_stage_completions(client_id, stage_key);
CREATE INDEX IF NOT EXISTS idx_stage_data_lookup ON flow_stage_data(client_id, stage_key);
