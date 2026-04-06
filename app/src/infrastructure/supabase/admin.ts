import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client for use inside unstable_cache functions.
 * Bypasses RLS — always scope queries by store_id / owner_id explicitly.
 * Never use on the client side.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin env vars')
  return createClient(url, key, { auth: { persistSession: false } })
}
