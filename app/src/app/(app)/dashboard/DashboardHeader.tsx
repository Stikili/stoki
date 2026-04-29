'use client'

import { useI18n } from '@/lib/i18n'

export default function DashboardHeader({ storeName, hour }: { storeName: string; hour: number }) {
  const { t } = useI18n()
  const greeting = hour < 12 ? t('dashboard.greeting.morning') : hour < 17 ? t('dashboard.greeting.afternoon') : t('dashboard.greeting.evening')

  return (
    <div>
      <h1 className="text-xl font-bold text-white">{greeting}</h1>
      <p className="text-muted text-sm mt-0.5">{storeName}</p>
    </div>
  )
}
