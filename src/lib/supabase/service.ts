import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client for SERVER-ONLY privileged operations.
 *
 * Use this for cross-account accounting that the logged-in user is authorized
 * to trigger but cannot perform under RLS — e.g. a sub-user creating a license
 * must read and deduct credits from their ADMIN's profile, which the RLS
 * policies (a user may only touch their own profile row) would otherwise block.
 *
 * IMPORTANT: never expose this client to the browser. Always authenticate and
 * authorize the caller with the normal RLS client first, then use this only to
 * carry out the already-authorized write.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase service configuration (URL or service role key)')
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
