// Admin client for bypassing RLS policies
// Note: In production, this should be used server-side only
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://yhticndmpvzczquivpfb.supabase.co";
// This should be your service role key - replace with actual service role key
const SUPABASE_SERVICE_ROLE_KEY = "YOUR_SERVICE_ROLE_KEY_HERE";

export const adminSupabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
