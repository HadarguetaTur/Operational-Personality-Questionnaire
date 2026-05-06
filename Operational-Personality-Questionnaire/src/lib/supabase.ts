import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase: חסרים VITE_SUPABASE_URL או VITE_SUPABASE_ANON_KEY ב-.env');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  db: { schema: 'public' }
});
