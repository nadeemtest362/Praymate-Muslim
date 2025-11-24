import { createClient, SupabaseClient } from '@supabase/supabase-js' // Standard import

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl) {
  console.error('ERROR: SUPABASE_URL environment variable is not set.');
  // Optionally, you could throw an error here to prevent the function from running with a misconfiguration
  // throw new Error('Missing SUPABASE_URL');
}
if (!supabaseServiceRoleKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set.');
  // throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

// Ensure that the client is of SupabaseClient type.
// The ?? '' is to satisfy createClient's type signature if env vars are missing,
// though the checks above should ideally prevent this from being an issue at runtime.
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl ?? 'missing_url',
  supabaseServiceRoleKey ?? 'missing_key',
  { auth: { persistSession: false } } // Recommended for server-side clients
) 