'use client'

import { useState, useTransition } from 'react'
import { Mail, Send, Check, Copy, Loader2, AlertCircle } from 'lucide-react'
import { createBetaInvite, type BetaInviteResult } from './actions'

/**
 * Founder-only beta invite form. Creates a pre-confirmed auth user,
 * hands back a temp password ONCE, and offers a WhatsApp-ready
 * message to paste to the invitee.
 *
 * No SMTP dependency — this exists precisely so we can onboard trusted
 * testers before Resend / custom SMTP is live. Post-Resend, this stays
 * useful for high-touch onboarding (co-founders, key partners) where
 * a founder handoff over WhatsApp is friendlier than a magic link.
 */
export default function BetaInviteCard() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<BetaInviteResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)

  function submit() {
    if (!email.trim() || isPending) return
    setResult(null)
    setCopiedPassword(false)
    setCopiedMessage(false)
    startTransition(async () => {
      const res = await createBetaInvite(email)
      setResult(res)
      if (res.ok) setEmail('')
    })
  }

  function reset() {
    setResult(null)
    setEmail('')
    setCopiedPassword(false)
    setCopiedMessage(false)
  }

  async function copy(text: string, kind: 'password' | 'message') {
    try {
      await navigator.clipboard.writeText(text)
      if (kind === 'password') { setCopiedPassword(true); setTimeout(() => setCopiedPassword(false), 2000) }
      else { setCopiedMessage(true); setTimeout(() => setCopiedMessage(false), 2000) }
    } catch {
      // Older browsers / non-HTTPS — user can manually select instead.
    }
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Beta invite</p>
          <p className="text-muted text-[11px] mt-0.5">
            Create a pre-confirmed account for a trusted tester. No email sent — you hand them the temp password directly.
          </p>
        </div>
      </div>

      {!result || !result.ok ? (
        <>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="tester@example.com"
                disabled={isPending}
                className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm"
                style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--foreground)', outline: 'none' }}
              />
            </div>
            <button
              onClick={submit}
              disabled={!email.trim() || isPending}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
              style={{ background: '#00C896', color: '#080f1a', opacity: !email.trim() || isPending ? 0.5 : 1 }}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {isPending ? 'Creating…' : 'Create'}
            </button>
          </div>

          {result && !result.ok && (
            <div
              className="mt-3 rounded-xl px-3 py-2.5 text-[12px] inline-flex items-start gap-2 w-full"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{result.error}</span>
            </div>
          )}
        </>
      ) : (
        <div
          className="rounded-xl p-3 space-y-3"
          style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.25)' }}
        >
          <div className="inline-flex items-center gap-2 text-[13px] font-semibold" style={{ color: '#00C896' }}>
            <Check size={14} /> Created — copy this now, it can&apos;t be shown again
          </div>

          {/* Email + temp password — big, monospace, copy button. */}
          <div className="rounded-lg p-3" style={{ background: 'var(--surface)' }}>
            <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Email</p>
            <p className="font-mono text-sm mb-3" style={{ color: 'var(--foreground)' }}>{result.email}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted mb-1">Temporary password</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-base tracking-wider flex-1" style={{ color: 'var(--foreground)' }}>{result.tempPassword}</p>
              <button
                onClick={() => copy(result.tempPassword, 'password')}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
              >
                {copiedPassword ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          </div>

          {/* WhatsApp-ready handover message. */}
          <div className="rounded-lg p-3" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted">WhatsApp message</p>
              <button
                onClick={() => copy(buildWhatsAppMessage(result.email, result.tempPassword), 'message')}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
              >
                {copiedMessage ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <pre
              className="text-[11px] whitespace-pre-wrap font-sans leading-relaxed"
              style={{ color: 'var(--foreground)', margin: 0 }}
            >{buildWhatsAppMessage(result.email, result.tempPassword)}</pre>
          </div>

          <button
            onClick={reset}
            className="w-full rounded-lg py-2 text-xs font-semibold"
            style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
          >
            Add another
          </button>
        </div>
      )}
    </div>
  )
}

function buildWhatsAppMessage(email: string, tempPassword: string): string {
  return `Hi 👋 Welcome to Stoki beta.

Log in at https://www.stokiapp.com/login

Email: ${email}
Temp password: ${tempPassword}

Please change your password after signing in (Settings → Account & preferences).

Any issues, reply here or email support@stokiapp.com.`
}
