-- SQL Schema for biometrics history
-- Execute this in your Supabase SQL Editor

-- 1. Create the biometrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS biometrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data JSONB NOT NULL,
  label TEXT NOT NULL DEFAULT 'Biometria',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. If the table already exists but is missing columns (common error), add them:
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
END $$;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_biometrics_timestamp ON biometrics(timestamp DESC);

-- Example Query to view history:
-- SELECT * FROM biometrics ORDER BY timestamp DESC;
