import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.includes('supabase.co'));

if (!isConfigured) {
    console.error("CRITICAL: Supabase URL or Anon Key is missing or invalid.");
}

// Export a flag to check configuration status in the UI
export const isSupabaseConfigured = isConfigured;

// Provide a safe instance or null (handled by services)
export const supabase = isConfigured
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null as any;
// We cast to any for the 'null' case to avoid breaking existing imports,
// but services should check isSupabaseConfigured.
