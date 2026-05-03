'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/infrastructure/supabase/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { MarketIndicatorRepository } from '@/infrastructure/supabase/repositories/MarketIndicatorRepository'
import {
  MarketIndicatorKind,
  NewMarketIndicator,
} from '@/domain/entities/market-indicator'

/**
 * Manual override for any market indicator. Owner-only — the bot prompt
 * cites these values, so we treat them as a privileged knob.
 *
 * Writes go through the admin client (bypasses RLS) but only after we've
 * verified the caller owns at least one store on this account.
 */
export async function saveMarketIndicatorAction(
  kind: MarketIndicatorKind,
  value: number,
  notes?: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Owner-only gate. market_indicators is global; "owner of any store on
  // this account" is sufficient privilege.
  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
  if ((stores?.length ?? 0) === 0) {
    return { ok: false, error: 'Only store owners can update market values.' }
  }

  if (!Number.isFinite(value)) return { ok: false, error: 'Value must be a number.' }

  const admin = createAdminClient()
  const repo = new MarketIndicatorRepository(admin)
  const data: NewMarketIndicator = {
    kind,
    value,
    source: 'manual override',
    measuredAt: new Date().toISOString().slice(0, 10),
    notes: notes?.trim() || null,
  }
  try {
    await repo.insert(data)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Save failed' }
  }

  revalidatePath('/settings/market')
  revalidatePath('/advisor')
  return { ok: true }
}
