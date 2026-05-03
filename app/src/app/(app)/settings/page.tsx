import Link from 'next/link'
import {
  Building2,
  Users,
  FileSpreadsheet,
  UserCircle2,
  Shield,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'
import { getServerData } from '@/lib/getServerData'

/**
 * Settings root — iOS-Settings-style navigation index. Each row drills into
 * a focused sub-page. Refactored from the previous monolithic 650-line page
 * because: (a) scrolling through every section to find one toggle was
 * frictionful, and (b) cashier-role users were seeing team-management UI
 * they couldn't act on.
 *
 * Sub-pages live under /settings/<section>:
 *   - store      Store name, phone, address, WhatsApp linking
 *   - team       Invite members + change roles  (owner only)
 *   - vat        VAT registration + bulk inclusivity toggle
 *   - account    Email, theme, language, notifications, sign out, delete
 */
export default async function SettingsPage() {
  const { store, role } = await getServerData()

  const sections = [
    {
      href: '/settings/store',
      icon: <Building2 size={18} color="#7B8CA1" strokeWidth={1.75} />,
      label: 'Store details',
      hint: 'Name, phone, address, WhatsApp linking',
      roles: ['owner', 'manager'] as const,
    },
    {
      href: '/settings/team',
      icon: <Users size={18} color="#7B8CA1" strokeWidth={1.75} />,
      label: 'Team',
      hint: 'Invite members and change roles',
      roles: ['owner'] as const,
    },
    {
      href: '/settings/vat',
      icon: <FileSpreadsheet size={18} color="#7B8CA1" strokeWidth={1.75} />,
      label: 'VAT & tax invoices',
      hint: store.vatRegistered ? `On · VAT ${store.vatRate.toFixed(0)}%` : 'Off — turn on if VAT-registered',
      roles: ['owner', 'manager'] as const,
    },
    {
      href: '/settings/account',
      icon: <UserCircle2 size={18} color="#7B8CA1" strokeWidth={1.75} />,
      label: 'Account & preferences',
      hint: 'Email, theme, language, notifications',
      roles: ['owner', 'manager', 'cashier'] as const,
    },
    {
      href: '/privacy',
      icon: <Shield size={18} color="#7B8CA1" strokeWidth={1.75} />,
      label: 'Privacy policy',
      roles: ['owner', 'manager', 'cashier'] as const,
    },
  ]

  const visible = sections.filter((s) => (s.roles as readonly string[]).includes(role))

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-xl font-bold text-white">Settings</h1>
      <p className="text-muted text-sm -mt-2">{store.name}</p>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {visible.map((s, i) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.04]"
            style={i === 0 ? {} : { borderTop: '1px solid var(--card-border)' }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface)' }}>
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{s.label}</p>
              {s.hint && <p className="text-muted text-[11px] mt-0.5 truncate">{s.hint}</p>}
            </div>
            <ChevronRight size={16} color="#7B8CA1" />
          </Link>
        ))}
      </div>

      {/* About / data backup — small text card at the bottom. */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <p className="text-xs uppercase tracking-widest text-muted">About</p>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Version</span>
          <span style={{ color: 'var(--foreground)' }}>MVP 1.0</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Region</span>
          <span style={{ color: 'var(--foreground)' }}>🇿🇦 South Africa</span>
        </div>
        <a
          href="/api/export"
          download
          className="block w-full text-center rounded-xl py-2.5 mt-2 text-xs font-semibold"
          style={{ background: '#142136', color: '#60A5FA', border: '1px solid #1E3A5F' }}
        >
          Download data backup (JSON)
        </a>
      </div>

      <p className="text-muted text-[11px] text-center pt-2 inline-flex items-center justify-center gap-1.5 w-full">
        <HelpCircle size={12} /> Need help? Send &ldquo;help&rdquo; to your stoki WhatsApp number.
      </p>
    </div>
  )
}
