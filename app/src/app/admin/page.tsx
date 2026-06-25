import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { effectivePlan, isGrandfatherActive } from '@/lib/effective-plan'
import { toStore } from '@/infrastructure/supabase/mappers'
import type { Store } from '@/domain/entities/store'

// Always fresh — admin signal data should never come from a stale cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Row {
  userId: string
  email: string | null
  phone: string | null
  signedUpAt: string
  emailConfirmedAt: string | null
  store: Store | null
}

export default async function AdminPage() {
  const admin = await requireAdmin()

  const sb = createAdminClient()

  // 1) Every signup — auth.users via admin API.
  // perPage caps at 1000 by Supabase. We're nowhere near that at launch;
  // when we cross it, paginate with `page: 2, 3, …`.
  const { data: usersResp } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const users = usersResp?.users ?? []

  // 2) Every active (non-deleted) store.
  const { data: storeRows } = await sb
    .from('stores')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const stores: Store[] = (storeRows ?? []).map(toStore)
  const storeByOwner = new Map<string, Store>()
  for (const s of stores) {
    // First store per owner wins (typically the primary). Multi-store owners
    // are still visible in totals; we just don't double-list them here.
    if (!storeByOwner.has(s.ownerId)) storeByOwner.set(s.ownerId, s)
  }

  const rows: Row[] = users
    .map<Row>(u => ({
      userId: u.id,
      email: u.email ?? null,
      phone: u.phone ?? null,
      signedUpAt: u.created_at,
      emailConfirmedAt: u.email_confirmed_at ?? null,
      store: storeByOwner.get(u.id) ?? null,
    }))
    .sort((a, b) => b.signedUpAt.localeCompare(a.signedUpAt))

  // Aggregates.
  const now = Date.now()
  const day  = 86_400_000
  const totalSignups   = users.length
  const totalStores    = stores.length
  const signupsToday   = users.filter(u => now - new Date(u.created_at).getTime() < day).length
  const signupsWeek    = users.filter(u => now - new Date(u.created_at).getTime() < 7 * day).length
  const onboardedCount = stores.filter(s => s.onboardingCompleted).length

  const planCounts = stores.reduce<Record<string, number>>((acc, s) => {
    const p = effectivePlan(s)
    acc[p] = (acc[p] ?? 0) + 1
    return acc
  }, {})
  const trialingCount = stores.filter(s => isGrandfatherActive(s)).length

  return (
    <div className="px-4 pt-6 pb-12 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Admin · Signups</h1>
          <p className="text-muted text-sm mt-0.5">Signed in as {admin.email}</p>
        </div>
      </div>

      {/* Aggregates */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Signups"            value={totalSignups.toString()}    sub={`+${signupsToday} today · +${signupsWeek} this week`} />
        <Stat label="Active stores"      value={totalStores.toString()}     sub={`${onboardedCount} completed onboarding`} />
        <Stat label="On Pro trial"       value={trialingCount.toString()}   sub="Grandfather window active" />
        <Stat label="Paid (non-trial)"   value={String((planCounts.pro ?? 0) + (planCounts.business ?? 0) + (planCounts.enterprise ?? 0) - trialingCount)} sub={describePaid(planCounts)} />
      </div>

      {/* Signups table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted" style={{ borderBottom: '1px solid var(--card-border)' }}>
          All signups
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }} className="text-muted text-[11px] uppercase tracking-wider">
                <th className="text-left px-4 py-2.5">Email</th>
                <th className="text-left px-4 py-2.5">Phone</th>
                <th className="text-left px-4 py-2.5">Store</th>
                <th className="text-left px-4 py-2.5">Category</th>
                <th className="text-left px-4 py-2.5">Plan</th>
                <th className="text-left px-4 py-2.5">Onboarded</th>
                <th className="text-left px-4 py-2.5">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">
                    No signups yet.
                  </td>
                </tr>
              )}
              {rows.map(r => {
                const plan = r.store ? effectivePlan(r.store) : null
                const inTrial = r.store ? isGrandfatherActive(r.store) : false
                return (
                  <tr key={r.userId} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td className="px-4 py-2.5">
                      <span style={{ color: 'var(--foreground)' }}>{r.email ?? <span className="text-muted">—</span>}</span>
                      {r.email && !r.emailConfirmedAt && (
                        <span className="ml-2 pill pill-orange min-h-0 text-[9px]">unconfirmed</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{r.phone ?? '—'}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--foreground)' }}>
                      {r.store?.name ?? <span className="text-muted">— no store —</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{r.store?.category ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {plan ? (
                        <span className={`pill min-h-0 text-[10px] ${plan === 'free' ? 'pill-orange' : 'pill-green'}`}>
                          {plan}{inTrial ? ' · trial' : ''}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted">
                      {r.store?.onboardingCompleted ? '✓' : (r.store ? '…' : '—')}
                    </td>
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">
                      {formatSignedUp(r.signedUpAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-muted text-[11px] text-center pt-2">
        Service-role read · {totalSignups} signups · {totalStores} stores
      </p>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <p className="text-muted text-[10px] font-semibold uppercase tracking-widest">{label}</p>
      <p className="text-[28px] font-bold leading-none mt-1" style={{ color: 'var(--foreground)' }}>{value}</p>
      <p className="text-muted text-[11px] mt-1.5">{sub}</p>
    </div>
  )
}

function describePaid(c: Record<string, number>): string {
  const parts: string[] = []
  if (c.pro)        parts.push(`${c.pro} pro`)
  if (c.business)   parts.push(`${c.business} biz`)
  if (c.enterprise) parts.push(`${c.enterprise} ent`)
  return parts.length ? parts.join(' · ') : 'No paying stores yet'
}

function formatSignedUp(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}
