import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('SUPABASE_CONFIG_URL');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('SUPABASE_CONFIG_KEY');

// Verify if the config is valid
const isConfigured = Boolean(
    SUPABASE_URL &&
    SUPABASE_KEY &&
    (SUPABASE_URL.includes('supabase.co') || SUPABASE_URL.includes('localhost'))
);

if (!isConfigured) {
    console.error("CRITICAL: Supabase URL or Anon Key is missing or invalid.");
}

// Export a flag to check configuration status in the UI
export const isSupabaseConfigured = isConfigured;

// Provide a safe instance or null (handled by services)
export const supabase = isConfigured
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null as any;

/**
 * Helper to update configuration at runtime (e.g. from a Setup UI)
 */
export const updateSupabaseConfig = (url: string, key: string) => {
    localStorage.setItem('SUPABASE_CONFIG_URL', url);
    localStorage.setItem('SUPABASE_CONFIG_KEY', key);
    window.location.reload(); // Reload to re-initialize client
};
