'use client'

import { useI18n } from '@/lib/i18n'
import UserMenu from '@/components/UserMenu'

export default function DashboardHeader({
  storeName,
  hour,
  storeCount,
}: {
  storeName: string
  hour: number
  storeCount: number
}) {
  const { t } = useI18n()
  const greeting = hour < 12 ? t('dashboard.greeting.morning') : hour < 17 ? t('dashboard.greeting.afternoon') : t('dashboard.greeting.evening')

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-white">{greeting}</h1>
        <p className="text-muted text-sm mt-0.5 truncate">{storeName}</p>
      </div>
      <UserMenu storeName={storeName} storeCount={storeCount} />
    </div>
  )
}
