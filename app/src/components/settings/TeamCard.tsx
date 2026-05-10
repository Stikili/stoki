'use client'

import { useState, useTransition } from 'react'
import { StoreUser, StoreRole, STORE_ROLES } from '@/domain/entities/store-user'
import { Store } from '@/domain/entities/store'
import {
  inviteMemberAction,
  updateMemberRoleAction,
  removeMemberAction,
} from '@/app/(app)/settings/actions'
import { hasFeature, type GateId } from '@/lib/plan-gates'
import UpgradePrompt from '@/components/UpgradePrompt'

export default function TeamCard({
  store,
  members,
  currentUserId,
}: {
  store: Store
  members: StoreUser[]
  currentUserId: string
}) {
  const [showInvite, setShowInvite] = useState(false)
  const [lockedGate, setLockedGate] = useState<GateId | null>(null)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Pre-compute which gate applies to the *next* invite. The server still
  // enforces this (settings/actions.ts.inviteMemberAction); the client check
  // just keeps us from opening a sheet the server is going to reject.
  const nextGate: GateId | null =
    members.length >= 2 && !hasFeature(store, 'team.invite.beyond_2') ? 'team.invite.beyond_2'
    : members.length >= 1 && !hasFeature(store, 'team.invite.beyond_owner') ? 'team.invite.beyond_owner'
    : null

  function handleInviteClick() {
    if (nextGate) { setLockedGate(nextGate); return }
    setShowInvite(true)
  }

  function handleInvite(fd: FormData) {
    startTransition(async () => {
      const result = await inviteMemberAction(fd)
      if (result.ok) {
        setFeedback({ kind: 'ok', msg: 'Member added — they\'ll see the store on next login' })
        setShowInvite(false)
      } else if (result.locked) {
        // Server-side gate fired — close the sheet and route the user to
        // the paywall instead of toasting a generic error.
        setShowInvite(false)
        setLockedGate(result.locked)
      } else {
        setFeedback({ kind: 'err', msg: result.error ?? 'Could not invite' })
      }
      setTimeout(() => setFeedback(null), 4000)
    })
  }

  function handleRoleChange(userId: string, newRole: StoreRole) {
    startTransition(async () => {
      const result = await updateMemberRoleAction(userId, newRole)
      if (!result.ok) setFeedback({ kind: 'err', msg: result.error ?? 'Could not update role' })
      setTimeout(() => setFeedback(null), 4000)
    })
  }

  function handleRemove(userId: string, label: string) {
    if (!confirm(`Remove ${label} from this store?`)) return
    startTransition(async () => {
      const result = await removeMemberAction(userId)
      if (!result.ok) setFeedback({ kind: 'err', msg: result.error ?? 'Could not remove' })
    })
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold" style={{ color: 'var(--foreground)' }}>Team</p>
        <button onClick={handleInviteClick} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: '#00C896', color: '#0A0E17' }}>
          + Invite
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
        Cashiers record sales only. Managers handle stock, expenses and reports. Owners manage the team and store settings.
      </p>

      {feedback && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold mb-3" style={feedback.kind === 'ok'
          ? { background: '#143328', color: '#00C896', border: '1px solid #1E4D3F' }
          : { background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          {feedback.msg}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {members.length === 0 ? (
          <p className="text-muted text-sm">No team members yet — tap Invite to add one.</p>
        ) : members.map(m => {
          const isSelf = m.userId === currentUserId
          return (
            <div key={m.id} className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                  {m.email ?? 'Unknown user'}{isSelf ? ' (you)' : ''}
                </p>
                <p className="text-muted text-xs">
                  Joined {new Date(m.joinedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <select
                value={m.role}
                disabled={isSelf}
                onChange={(e) => handleRoleChange(m.userId, e.target.value as StoreRole)}
                className="text-xs font-semibold px-2 py-1 rounded-lg"
                style={{ background: 'var(--card-bg)', color: 'var(--foreground)', border: '1px solid var(--card-border)', opacity: isSelf ? 0.5 : 1 }}
              >
                {STORE_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {!isSelf && (
                <button
                  onClick={() => handleRemove(m.userId, m.email ?? 'this user')}
                  className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowInvite(false)} />
          <div className="relative rounded-t-3xl p-6 pb-24 sheet">
            <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>Invite Team Member</h2>
            <p className="text-muted text-sm mb-5">
              They&apos;ll get a magic-link email if they&apos;re not on Stoki yet, or be added to your store immediately if they are.
            </p>
            <form action={handleInvite} className="flex flex-col gap-3">
              <input name="email" type="email" placeholder="Email *" required autoFocus className="input" />
              <select name="role" defaultValue="cashier" className="input">
                {STORE_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label} — {r.description}</option>
                ))}
              </select>
              <button type="submit" disabled={isPending} className="btn-primary mt-2">
                {isPending ? 'Inviting…' : 'Send Invite'}
              </button>
            </form>
          </div>
        </div>
      )}

      <UpgradePrompt
        gate={lockedGate ?? 'team.invite.beyond_owner'}
        open={lockedGate !== null}
        onClose={() => setLockedGate(null)}
      />
    </div>
  )
}
