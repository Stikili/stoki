import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getServerData } from '@/lib/getServerData'
import VatCard from '@/components/settings/VatCard'

export default async function VatSettingsPage() {
  const { store } = await getServerData()
  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-muted text-sm">
        <ArrowLeft size={14} /> Settings
      </Link>
      <h1 className="text-xl font-bold text-white">VAT &amp; Tax invoices</h1>
      <VatCard store={store} />
    </div>
  )
}
