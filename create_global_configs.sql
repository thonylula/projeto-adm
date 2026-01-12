-- SQL Schema for global_configs table
-- Run this in Supabase SQL Editor to enable Mortality Data Persistence

-- 1. Create table
CREATE TABLE IF NOT EXISTS global_configs (
  id TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Disable RLS (Critical for persistence without auth rules)
ALTER TABLE global_configs DISABLE ROW LEVEL SECURITY;

-- 3. Comment
COMMENT ON TABLE global_configs IS 'Tabela genérica para armazenar configurações e dados JSON (Mortalidade, Históricos, etc)';
