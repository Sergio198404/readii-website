-- Migration: lead capture (v2.4.0)
-- Date: 2026-04-30
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- nullable: anonymous leads allowed
  name TEXT NOT NULL,
  contact TEXT NOT NULL,                    -- WeChat or email (free text)
  service_type TEXT NOT NULL CHECK (service_type IN (
    'company_formation', 'vat_registration', 'bank_account',
    'school_application', 'hr_sponsor_licence', 'business_coaching', 'other'
  )),
  message TEXT,                              -- repurposed for "best time to contact" string
  source_module TEXT,                        -- 'email' | 'meeting' | 'education' | 'daily' | 'setup'
  source_level INT,                          -- 1-5
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can submit a lead
DROP POLICY IF EXISTS "Anyone insert leads" ON leads;
CREATE POLICY "Anyone insert leads"
  ON leads FOR INSERT WITH CHECK (true);

-- Only service role can read leads (admin / Kevin via Supabase dashboard)
DROP POLICY IF EXISTS "Service role read all leads" ON leads;
CREATE POLICY "Service role read all leads"
  ON leads FOR SELECT USING (auth.role() = 'service_role');
