import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getServerData } from '@/lib/getServerData'
import PrinterSettingsClient from '@/components/settings/PrinterSettingsClient'

export default async function PrinterSettingsPage() {
  const { store } = await getServerData()

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-muted text-sm">
        <ArrowLeft size={14} /> Settings
      </Link>
      <h1 className="text-xl font-bold text-white">Bluetooth Printer</h1>
      <PrinterSettingsClient storeName={store.name} />
    </div>
  )
}
