-- SQL Schema for Viveiros (Fish Ponds) Table
-- Execute this in your Supabase SQL Editor

-- 1. Create the table ONLY if it doesn't exist
CREATE TABLE IF NOT EXISTS viveiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  coordinates JSONB NOT NULL, -- Array of {lat: number, lng: number}
  area_m2 DECIMAL(10,2) NOT NULL,
  -- status TEXT DEFAULT 'VAZIO', -- We add this safely below
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add 'status' column safely if it doesn't exist (Migration)
ALTER TABLE viveiros 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'VAZIO';

-- 3. Add index safely
CREATE INDEX IF NOT EXISTS idx_viveiros_company_id ON viveiros(company_id);

-- 4. RLS - Already configured? Safe to run these commands even if enabled
-- ALTER TABLE viveiros ENABLE ROW LEVEL SECURITY;
