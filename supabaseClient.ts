import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://REMOVED_SUPABASE_URL';
const SUPABASE_KEY = 'REMOVED_SECRET';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
