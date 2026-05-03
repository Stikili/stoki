import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getServerData } from '@/lib/getServerData'
import { AccountCards, DangerZone } from '@/components/settings/AccountCards'

export default async function AccountSettingsPage() {
  const { store } = await getServerData()
  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-muted text-sm">
        <ArrowLeft size={14} /> Settings
      </Link>
      <h1 className="text-xl font-bold text-white">Account &amp; preferences</h1>
      <AccountCards storeId={store.id} />

      <div className="pt-4 mt-2 space-y-3" style={{ borderTop: '1px solid var(--card-border)' }}>
        <p className="text-xs uppercase tracking-widest text-muted ml-1">Danger zone</p>
        <DangerZone />
      </div>
    </div>
  )
}
