'use client'

import { useEffect } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useOfflineStore } from '@/lib/offline-store'
import { useI18n } from '@/lib/i18n'

export default function OfflineBanner() {
  const { isOnline } = useOnlineStatus()
  const { pendingSales, isSyncing, sync } = useOfflineStore()
  const { t } = useI18n()
  const count = pendingSales.length

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && count > 0 && !isSyncing) {
      sync()
    }
  }, [isOnline, count, isSyncing, sync])

  if (isOnline && count === 0) return null

  return (
    <div
      className="px-4 py-2.5 text-sm font-semibold text-center"
      style={
        !isOnline
          ? { background: 'var(--pill-yellow-bg)', color: '#F59E0B' }
          : { background: 'var(--pill-green-bg)', color: '#00C896' }
      }
    >
      {!isOnline
        ? t('offline.banner')
        : isSyncing
          ? t('offline.syncing', { count: String(count) })
          : t('offline.syncing', { count: String(count) })
      }
    </div>
  )
}
