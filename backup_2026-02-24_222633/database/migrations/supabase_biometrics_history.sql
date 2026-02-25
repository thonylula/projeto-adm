-- SQL Schema for biometrics history (ULTRA ROBUST VERSION)
-- Execute this in your Supabase SQL Editor

-- 0. Enable UUID extension (CRITICAL for defaults)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create the biometrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS biometrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB NOT NULL,
  label TEXT NOT NULL DEFAULT 'Biometria',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. If the table already exists but is missing columns, add them:
DO $$ 
BEGIN 
    -- Add timestamp column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometrics' AND column_name='timestamp') THEN
        ALTER TABLE biometrics ADD COLUMN timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add label column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometrics' AND column_name='label') THEN
        ALTER TABLE biometrics ADD COLUMN label TEXT NOT NULL DEFAULT 'Biometria';
    END IF;

    -- Ensure ID has a default generator
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometrics' AND column_name='id' AND column_default IS NULL) THEN
        ALTER TABLE biometrics ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_biometrics_timestamp ON biometrics(timestamp DESC);

-- 4. Disable RLS (CRITICAL to avoid Insert/Save errors)
ALTER TABLE biometrics DISABLE ROW LEVEL SECURITY;
