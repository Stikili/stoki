'use client'

import { useState, useTransition } from 'react'
import { Trash2, KeyRound, Check, AlertCircle, Loader2 } from 'lucide-react'
import { deleteUserAsAdmin, sendPasswordResetAsAdmin, type AdminActionResult } from './actions'

/**
 * Per-row admin actions column: delete + send-password-reset.
 *
 * Both actions are gated inside the server action (`requireAdmin()`),
 * so the client component only handles UX — confirmation dialog,
 * pending state, success/error toasts inline.
 *
 * Delete is destructive so we require a typed-DELETE confirmation.
 * Reset is idempotent so no confirmation — a mis-click just resends
 * the reset email, which is annoying but not dangerous.
 */
export default function UserActionsCell({ userId, email }: { userId: string; email: string | null }) {
  const [state, setState] = useState<AdminActionResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!email) {
      const typed = prompt(`Delete this user (no email on file)?\nType DELETE to confirm:`)
      if (typed !== 'DELETE') return
    } else {
      const typed = prompt(
        `Permanently delete ${email}?\nThis removes their auth account and every store they own.\nType DELETE to confirm:`,
      )
      if (typed !== 'DELETE') return
    }
    setState(null)
    startTransition(async () => {
      const res = await deleteUserAsAdmin(userId)
      setState(res)
      // Give the toast a moment before the row disappears from the
      // revalidated page render.
      if (res.ok) setTimeout(() => window.location.reload(), 1500)
    })
  }

  function handleReset() {
    if (!email) {
      setState({ ok: false, error: 'No email on file — password reset needs an email.' })
      return
    }
    setState(null)
    startTransition(async () => {
      const res = await sendPasswordResetAsAdmin(email)
      setState(res)
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleReset}
          disabled={isPending || !email}
          title={email ? `Send password reset to ${email}` : 'No email on file'}
          className="rounded-md px-2 py-1 text-[10px] font-semibold inline-flex items-center gap-1"
          style={{
            background: 'rgba(0, 200, 150, 0.10)',
            color: '#00C896',
            border: '1px solid rgba(0, 200, 150, 0.25)',
            opacity: isPending || !email ? 0.5 : 1,
          }}
        >
          {isPending ? <Loader2 size={10} className="animate-spin" /> : <KeyRound size={10} />}
          Reset
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          title="Permanently delete this user + every store they own"
          className="rounded-md px-2 py-1 text-[10px] font-semibold inline-flex items-center gap-1"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.20)',
            opacity: isPending ? 0.5 : 1,
          }}
        >
          {isPending ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
          Delete
        </button>
      </div>
      {state && (
        <p
          className="text-[10px] inline-flex items-start gap-1"
          style={{ color: state.ok ? '#00C896' : '#ef4444' }}
        >
          {state.ok
            ? <><Check size={10} className="mt-0.5 flex-shrink-0" /><span>{state.message ?? 'Done.'}</span></>
            : <><AlertCircle size={10} className="mt-0.5 flex-shrink-0" /><span>{state.error}</span></>
          }
        </p>
      )}
    </div>
  )
}
