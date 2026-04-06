'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/infrastructure/supabase/client'
import { Store } from '@/domain/entities/store'
import { updateStoreAction, deleteStoreAction } from './actions'
import PushSubscribeButton from '@/components/PushSubscribeButton'
import { useI18n, LOCALE_NAMES, type Locale } from '@/lib/i18n'
import { useTheme } from '@/components/ThemeProvider'

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

export default function SettingsClient({ store, canDelete }: { store: Store; canDelete: boolean }) {
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [storeSaved, setStoreSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  function addEmail() {
    if (!email.includes('@')) return
    startTransition(async () => {
      setError(null)
      const { error } = await supabase.auth.updateUser({ email })
      if (error) {
        setError(error.message)
      } else {
        setEmailSent(true)
      }
    })
  }

  function handleUpdateStore(formData: FormData) {
    startTransition(async () => {
      await updateStoreAction(formData)
      setStoreSaved(true)
      setTimeout(() => setStoreSaved(false), 3000)
    })
  }

  function handleDeleteStore() {
    if (!confirm(`Delete "${store.name}"? This cannot be undone.`)) return
    startTransition(() => deleteStoreAction(store.id))
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-xl font-bold text-white mb-2">Settings</h1>

      {/* Store details */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <p className="text-white font-semibold mb-1">Store details</p>
        <p className="text-muted text-sm mb-4">Update your store name and contact number.</p>
        {storeSaved && (
          <div
            className="rounded-xl px-4 py-3 text-sm font-semibold mb-3"
            style={{ background: '#143328', color: '#00C896', border: '1px solid #1E4D3F' }}
          >
            ✓ Store updated
          </div>
        )}
        <form action={handleUpdateStore} className="flex flex-col gap-3">
          <input
            name="name"
            defaultValue={store.name}
            placeholder="Store name *"
            required
            style={inputStyle}
          />
          <input
            name="phone"
            type="tel"
            defaultValue={store.phone ?? ''}
            placeholder="Store phone (optional)"
            style={inputStyle}
          />
          <div>
            <input
              name="location"
              defaultValue={store.location ?? ''}
              placeholder="Area / suburb (e.g. Soweto, Khayelitsha)"
              style={inputStyle}
            />
            <p className="text-muted text-xs mt-1.5 ml-1">
              Helps stoki give you market-relevant advice for your area
            </p>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl py-3 font-semibold text-sm"
            style={{
              background: '#00C896',
              color: '#080f1a',
              boxShadow: 'none',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        {canDelete && (
          <button
            onClick={handleDeleteStore}
            disabled={isPending}
            className="w-full mt-3 rounded-xl py-3 font-semibold text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', opacity: isPending ? 0.5 : 1 }}
          >
            Delete this store
          </button>
        )}
      </div>

      {/* Add / update email */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <p className="text-white font-semibold mb-1">Email address</p>
        <p className="text-muted text-sm mb-4">
          Add an email for magic link login as a backup to your phone.
        </p>
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

      {/* Theme */}
      <ThemeToggle />

      {/* Language */}
      <LanguageSelector />

      {/* Push notifications */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <p className="text-white font-semibold mb-1">Notifications</p>
        <p className="text-muted text-sm mb-4">Stay on top of low stock and unpaid debts.</p>
        <PushSubscribeButton storeId={store.id} />
      </div>

      {/* App info */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <p className="text-white font-semibold mb-3">About</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">App</span>
            <span className="text-white">stoki</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Version</span>
            <span className="text-white">MVP 1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Region</span>
            <span className="text-white">🇿🇦 South Africa</span>
          </div>
        </div>
      </div>

      {/* Data export */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <p className="text-white font-semibold mb-1">Data Backup</p>
        <p className="text-muted text-sm mb-4">Download all your store data as a JSON file.</p>
        <a
          href="/api/export"
          download
          className="block w-full text-center rounded-xl py-3 font-semibold text-sm"
          style={{ background: '#142136', color: '#60A5FA', border: '1px solid #1E3A5F' }}
        >
          Download Backup
        </a>
      </div>

      {/* Privacy */}
      <a href="/privacy" className="block rounded-2xl p-4 text-sm font-semibold text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}>
        Privacy Policy
      </a>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full rounded-2xl p-4 text-sm font-semibold text-danger"
        style={{ background: '#2D1518', border: '1px solid #4D1F23' }}
      >
        Sign out
      </button>

      {/* Delete account */}
      <button
        onClick={async () => {
          if (!confirm('Are you sure? This will permanently delete your account and ALL your store data. This cannot be undone.')) return
          if (!confirm('Last chance — type DELETE in the next prompt to confirm.')) return
          const typed = prompt('Type DELETE to confirm:')
          if (typed !== 'DELETE') return
          const res = await fetch('/api/account/delete', { method: 'DELETE' })
          if (res.ok) { await supabase.auth.signOut(); window.location.href = '/login' }
          else alert('Failed to delete account. Please try again.')
        }}
        className="w-full rounded-2xl p-4 text-xs font-semibold"
        style={{ background: 'transparent', border: '1px solid #4D1F23', color: '#EF4444', opacity: 0.7 }}
      >
        Delete my account and all data
      </button>
    </div>
  )
}

function LanguageSelector() {
  const { locale, setLocale, t } = useI18n()
  const locales = Object.entries(LOCALE_NAMES) as [Locale, string][]

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <p className="text-white font-semibold mb-1">{t('settings.language')}</p>
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
    <div className="rounded-2xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Appearance</p>
      <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Choose light or dark mode.</p>
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
