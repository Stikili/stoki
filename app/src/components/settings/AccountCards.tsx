'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/infrastructure/supabase/client'
import { useI18n, LOCALE_NAMES, type Locale } from '@/lib/i18n'
import { useTheme } from '@/components/ThemeProvider'
import PushSubscribeButton from '@/components/PushSubscribeButton'
import { setSimpleViewAction } from '@/app/(app)/settings/actions'

const cardStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '16px',
}

const inputStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--card-border)',
  borderRadius: '14px',
  padding: '14px 16px',
  color: 'var(--foreground)',
  fontSize: '16px',
  outline: 'none',
  width: '100%',
} as const

/**
 * Bundle of "your account" controls — email, theme, language, push.
 * Sign out + delete account live alongside in <DangerZone>. Both render on
 * /settings/account; the danger-zone is split out so it can be visually
 * isolated at the bottom of that page.
 */
export function AccountCards({ storeId, simpleView, storeName }: { storeId: string; simpleView: boolean; storeName: string }) {
  return (
    <>
      <EmailCard />
      <ThemeToggle />
      <DashboardDensityCard initial={simpleView} storeName={storeName} />
      <LanguageSelector />
      <NotificationsCard storeId={storeId} />
      <DataExportCard />
    </>
  )
}

/**
 * POPIA data-portability card. One click = full JSON dump of every
 * personal-information record Stoki holds for this account. Section 23
 * of POPIA gives the data subject the right to access their info; this
 * card is the concrete UX satisfying that promise from the privacy
 * policy.
 *
 * Rendered as a plain <a href download> so the browser handles the
 * save-as dialog natively (no blob-shuffle in JS). Endpoint is
 * `/api/account/export` which returns a JSON blob with a proper
 * Content-Disposition attachment header.
 */
function DataExportCard() {
  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Download my data</p>
      <p className="text-muted text-sm mb-4">
        POPIA gives you the right to a copy of your personal information. Download a JSON file with every record Stoki holds on you — your profile, every store you have access to, and all business records inside.
      </p>
      <a
        href="/api/account/export"
        download
        className="inline-flex items-center justify-center w-full rounded-xl py-3 font-semibold text-sm"
        style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
      >
        Download my data (JSON)
      </a>
      <p className="text-muted text-[11px] mt-2 ml-1">
        Large accounts may take a few seconds. If the download stalls, email <a href="mailto:hello@stokiapp.com" className="underline">hello@stokiapp.com</a> and we&apos;ll send it manually.
      </p>
    </div>
  )
}

/**
 * "Simple" vs "Full" dashboard view. Simple keeps the Daily tools always
 * visible and collapses the Books section (reports, invoices, payroll,
 * assets, POs, etc.) behind a click-to-expand. Full shows everything.
 *
 * Stored per-store so an owner running both a spaza and a formal SMME
 * keeps each dashboard at the right density without having to flip the
 * toggle every time they switch shops.
 */
function DashboardDensityCard({ initial, storeName }: { initial: boolean; storeName: string }) {
  const [simple, setSimple] = useState(initial)
  const [isPending, startTransition] = useTransition()

  function set(next: boolean) {
    if (next === simple) return
    setSimple(next) // optimistic
    startTransition(async () => {
      try {
        await setSimpleViewAction(next)
      } catch {
        setSimple(!next) // revert on failure
      }
    })
  }

  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Dashboard density</p>
      <p className="text-muted text-sm mb-4">
        How many tools to show on the dashboard for <span style={{ color: 'var(--foreground)' }}>{storeName}</span>.
        Simple keeps daily tools (Cash up, Stock, Prices) front and centre and tucks accounting tools (Reports, Invoices, Payroll, Assets, POs) behind a tap. Switch to Full any time.
      </p>
      <div className="flex gap-2">
        {([
          { key: true,  label: 'Simple', sub: 'Daily tools' },
          { key: false, label: 'Full',   sub: 'Everything' },
        ] as const).map(opt => (
          <button
            key={String(opt.key)}
            onClick={() => set(opt.key)}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex flex-col items-center gap-0.5"
            style={simple === opt.key
              ? { background: '#00C896', color: 'var(--btn-primary-text)' }
              : { background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--card-border)' }
            }
          >
            <span>{opt.label}</span>
            <span className="text-[10px] font-medium opacity-80">{opt.sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function DangerZone() {
  const supabase = createClient()
  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }
  async function deleteAccount() {
    if (!confirm('Are you sure? This will permanently delete your account and ALL your store data. This cannot be undone.')) return
    if (!confirm('Last chance — type DELETE in the next prompt to confirm.')) return
    const typed = prompt('Type DELETE to confirm:')
    if (typed !== 'DELETE') return
    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    if (res.ok) { await supabase.auth.signOut(); window.location.href = '/login' }
    else alert('Failed to delete account. Please try again.')
  }

  return (
    <>
      <button
        onClick={signOut}
        className="w-full rounded-2xl p-4 text-sm font-semibold text-danger"
        style={{ background: '#2D1518', border: '1px solid #4D1F23' }}
      >
        Sign out
      </button>
      <button
        onClick={deleteAccount}
        className="w-full rounded-2xl p-4 text-xs font-semibold"
        style={{ background: 'transparent', border: '1px solid #4D1F23', color: '#EF4444', opacity: 0.7 }}
      >
        Delete my account and all data
      </button>
    </>
  )
}

function EmailCard() {
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  function addEmail() {
    if (!email.includes('@')) return
    startTransition(async () => {
      setError(null)
      const { error } = await supabase.auth.updateUser({ email })
      if (error) setError(error.message)
      else setEmailSent(true)
    })
  }

  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Email address</p>
      <p className="text-muted text-sm mb-4">Add an email for magic link login as a backup to your phone.</p>
      {emailSent ? (
        <div
          className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: '#143328', color: '#00C896', border: '1px solid #1E4D3F' }}
        >
          ✓ Confirmation sent to {email} — check your inbox.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <button
            onClick={addEmail}
            disabled={isPending || !email.includes('@')}
            className="rounded-xl py-3 font-semibold text-sm"
            style={{
              background: email.includes('@') && !isPending ? '#00C896' : '#1A2236',
              color: email.includes('@') && !isPending ? '#0A0E17' : '#5A6B80',
            }}
          >
            {isPending ? 'Sending…' : 'Add email'}
          </button>
          {error && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</p>
          )}
        </div>
      )}
    </div>
  )
}

function LanguageSelector() {
  const { locale, setLocale, t } = useI18n()
  const locales = Object.entries(LOCALE_NAMES) as [Locale, string][]

  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>{t('settings.language')}</p>
      <p className="text-muted text-sm mb-4">Choose your preferred language.</p>
      <div className="flex flex-wrap gap-2">
        {locales.map(([code, name]) => (
          <button
            key={code}
            onClick={() => setLocale(code)}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={locale === code
              ? { background: '#00C896', color: 'var(--btn-primary-text)' }
              : { background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--muted)' }
            }
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Appearance</p>
      <p className="text-muted text-sm mb-4">Choose light or dark mode.</p>
      <div className="flex gap-2">
        {(['dark', 'light'] as const).map(t => (
          <button key={t} onClick={toggle}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={theme === t
              ? { background: '#00C896', color: 'var(--btn-primary-text)' }
              : { background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--card-border)' }
            }>
            {t === 'dark' ? '🌙' : '☀️'} {t === 'dark' ? 'Dark' : 'Light'}
          </button>
        ))}
      </div>
    </div>
  )
}

function NotificationsCard({ storeId }: { storeId: string }) {
  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Notifications</p>
      <p className="text-muted text-sm mb-4">Stay on top of low stock and unpaid debts.</p>
      <PushSubscribeButton storeId={storeId} />
    </div>
  )
}
