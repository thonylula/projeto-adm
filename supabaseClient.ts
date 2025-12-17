import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tkmguifxrliivyqhwwsg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_brtq2_CpIfqw_gorj2k0wg__fKRWh8v';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
