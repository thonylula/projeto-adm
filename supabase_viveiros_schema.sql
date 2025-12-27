-- SQL Schema for Viveiros (Fish Ponds) Table
-- Execute this in your Supabase SQL Editor

CREATE TABLE viveiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  coordinates JSONB NOT NULL, -- Array of {lat: number, lng: number}
  area_m2 DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster company queries
CREATE INDEX idx_viveiros_company_id ON viveiros(company_id);

-- Row Level Security (RLS) - Adjust based on your auth setup
-- ALTER TABLE viveiros ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (if using Supabase Auth)
-- CREATE POLICY "Users can view viveiros" ON viveiros FOR SELECT USING (true);
-- CREATE POLICY "Users can insert viveiros" ON viveiros FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Users can update viveiros" ON viveiros FOR UPDATE USING (true);
-- CREATE POLICY "Users can delete viveiros" ON viveiros FOR DELETE USING (true);
