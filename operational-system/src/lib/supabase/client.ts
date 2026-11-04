import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client for use in client components (anon key + user session).
 * Database typing will be applied after running `supabase gen types typescript`.
 */
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (typeof window === 'undefined') {
      return null as unknown as SupabaseClient;
    }
    throw new Error('Missing Supabase environment variables');
  }

  return createBrowserClient(url, key);
}
