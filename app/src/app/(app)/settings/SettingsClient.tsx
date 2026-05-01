'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/infrastructure/supabase/client'
import { Store } from '@/domain/entities/store'
import { StoreUser, StoreRole, STORE_ROLES } from '@/domain/entities/store-user'
import {
  updateStoreAction,
  updateVatAction,
  deleteStoreAction,
  inviteMemberAction,
  updateMemberRoleAction,
  removeMemberAction,
} from './actions'
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

export default function SettingsClient({
  store,
  canDelete,
  role,
  currentUserId,
  members,
}: {
  store: Store
  canDelete: boolean
  role: StoreRole
  currentUserId: string
  members: StoreUser[]
}) {
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
          <div>
            <input
              name="whatsappNumber"
              type="tel"
              defaultValue={store.whatsappNumber ?? ''}
              placeholder="Your WhatsApp number (e.g. 0821234567)"
              style={inputStyle}
            />
            <p className="text-muted text-xs mt-1.5 ml-1">
              Link your number to use the stoki WhatsApp bot — send &quot;help&quot; to get started
            </p>
          </div>
          <div>
            <textarea
              name="businessAddress"
              defaultValue={store.businessAddress ?? ''}
              placeholder="Business address (printed on tax invoices)"
              rows={2}
              style={inputStyle}
            />
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

      {/* Team — owner only */}
      {role === 'owner' && (
        <TeamCard storeId={store.id} members={members} currentUserId={currentUserId} />
      )}

      {/* VAT & Tax Invoices */}
      <VatCard store={store} />

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

      {/* Manage */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <a href="/cashup" className="flex items-center justify-between px-4 py-3.5 text-sm font-semibold" style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--foreground)' }}>
          <span>Cash up</span>
          <span className="text-muted">→</span>
        </a>
        <a href="/reports" className="flex items-center justify-between px-4 py-3.5 text-sm font-semibold" style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--foreground)' }}>
          <span>Reports (P&amp;L · VAT · Sales export)</span>
          <span className="text-muted">→</span>
        </a>
        <a href="/expenses" className="flex items-center justify-between px-4 py-3.5 text-sm font-semibold" style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--foreground)' }}>
          <span>Expenses</span>
          <span className="text-muted">→</span>
        </a>
        <a href="/suppliers" className="flex items-center justify-between px-4 py-3.5 text-sm font-semibold" style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--foreground)' }}>
          <span>Suppliers</span>
          <span className="text-muted">→</span>
        </a>
        <a href="/customers" className="flex items-center justify-between px-4 py-3.5 text-sm font-semibold" style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--foreground)' }}>
          <span>Customers (B2B accounts)</span>
          <span className="text-muted">→</span>
        </a>
        <a href="/invoices" className="flex items-center justify-between px-4 py-3.5 text-sm font-semibold" style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--foreground)' }}>
          <span>Invoices</span>
          <span className="text-muted">→</span>
        </a>
        <a href="/pricelist" className="flex items-center justify-between px-4 py-3.5 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          <span>Price list</span>
          <span className="text-muted">→</span>
        </a>
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

function TeamCard({ storeId, members, currentUserId }: { storeId: string; members: StoreUser[]; currentUserId: string }) {
  const [showInvite, setShowInvite] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleInvite(fd: FormData) {
    startTransition(async () => {
      const result = await inviteMemberAction(fd)
      if (result.ok) {
        setFeedback({ kind: 'ok', msg: 'Member added — they\'ll see the store on next login' })
        setShowInvite(false)
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

  // Suppress storeId-unused: it's part of the public API of this card and may be
  // useful in future actions; keep it on the props.
  void storeId

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold" style={{ color: 'var(--foreground)' }}>Team</p>
        <button onClick={() => setShowInvite(true)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: '#00C896', color: '#0A0E17' }}>
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
    </div>
  )
}

function VatCard({ store }: { store: Store }) {
  const [vatOn, setVatOn] = useState(store.vatRegistered)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      await updateVatAction(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>VAT &amp; Tax Invoices</p>
      <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
        Toggle on if your business is VAT-registered. Receipts then become SARS-compliant tax invoices with sequential numbering and a VAT breakdown.
      </p>
      {saved && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold mb-3" style={{ background: '#143328', color: '#00C896', border: '1px solid #1E4D3F' }}>
          ✓ VAT settings updated
        </div>
      )}
      <form action={handleSubmit} className="flex flex-col gap-3">
        <label className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 cursor-pointer" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>I am VAT-registered</span>
          <input
            type="checkbox"
            name="vatRegistered"
            checked={vatOn}
            onChange={(e) => setVatOn(e.target.checked)}
            className="w-5 h-5 accent-brand"
          />
        </label>
        {vatOn && (
          <>
            <input
              name="vatNumber"
              defaultValue={store.vatNumber ?? ''}
              placeholder="VAT number (e.g. 4123456789)"
              required
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--card-border)',
                borderRadius: '14px',
                padding: '14px 16px',
                color: 'var(--foreground)',
                fontSize: '16px',
                outline: 'none',
                width: '100%',
              }}
            />
            <div>
              <input
                name="vatRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={store.vatRate ?? 15}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  color: 'var(--foreground)',
                  fontSize: '16px',
                  outline: 'none',
                  width: '100%',
                }}
              />
              <p className="text-muted text-xs mt-1.5 ml-1">VAT rate (%) — SA standard is 15.00</p>
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl py-3 font-semibold text-sm"
          style={{ background: '#00C896', color: '#080f1a', opacity: isPending ? 0.6 : 1 }}
        >
          {isPending ? 'Saving…' : 'Save VAT settings'}
        </button>
      </form>
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
