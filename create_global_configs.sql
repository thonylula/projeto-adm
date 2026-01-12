-- SQL Schema for global_configs table (ROBUST VERSION)
-- Run this in Supabase SQL Editor

-- 1. Create table if not exists (Generic JSON Storage)
CREATE TABLE IF NOT EXISTS global_configs (
  id TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Disable RLS (Legacy approach for quick access)
ALTER TABLE global_configs DISABLE ROW LEVEL SECURITY;

-- 3. EXPLICIT GRANTS (Fix for "Permission Denied" even with RLS disabled in some setups)
GRANT ALL ON TABLE global_configs TO anon;
GRANT ALL ON TABLE global_configs TO authenticated;
GRANT ALL ON TABLE global_configs TO service_role;

-- 4. Comment
COMMENT ON TABLE global_configs IS 'Tabela de configuração global com permissões públicas para app JS.';
