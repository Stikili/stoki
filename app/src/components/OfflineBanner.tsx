'use client'

import { useEffect, useRef, useState } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useOfflineStore } from '@/lib/offline-store'
import { useI18n } from '@/lib/i18n'

export default function OfflineBanner() {
  const { isOnline } = useOnlineStatus()
  const { pendingSales, isSyncing, sync } = useOfflineStore()
  const { t } = useI18n()
  const count = pendingSales.length
  const prevCount = useRef(count)
  const [justSynced, setJustSynced] = useState(false)

  // Auto-sync when coming back online or when new pending sales appear while online.
  useEffect(() => {
    if (isOnline && count > 0 && !isSyncing) {
      sync()
    }
  }, [isOnline, count, isSyncing, sync])

  // Flash a "Synced!" confirmation when the queue drains. Watch the count
  // transition from >0 → 0; we defer the setState through setTimeout so it
  // doesn't fire synchronously inside the effect body (avoids the
  // set-state-in-effect cascading-render hazard).
  useEffect(() => {
    if (prevCount.current > 0 && count === 0 && isOnline) {
      const tShow = setTimeout(() => setJustSynced(true), 0)
      const tHide = setTimeout(() => setJustSynced(false), 2400)
      prevCount.current = count
      return () => { clearTimeout(tShow); clearTimeout(tHide) }
    }
    prevCount.current = count
  }, [count, isOnline])

  if (isOnline && count === 0 && !justSynced) return null

  // Style + label resolution. Order matters: offline > synced-confirmation > syncing > queued.
  let label: string
  let palette: { bg: string; fg: string }
  if (!isOnline) {
    label = t('offline.banner')
    palette = { bg: 'var(--pill-yellow-bg)', fg: '#F59E0B' }
  } else if (justSynced) {
    label = '✓ Synced'
    palette = { bg: 'var(--pill-green-bg)', fg: '#00C896' }
  } else if (isSyncing) {
    label = t('offline.syncing', { count: String(count) })
    palette = { bg: 'var(--pill-green-bg)', fg: '#00C896' }
  } else {
    label = `${count} sale${count === 1 ? '' : 's'} waiting to sync — tap to retry`
    palette = { bg: 'var(--pill-orange-bg)', fg: '#F97316' }
  }

  const tappable = isOnline && count > 0 && !isSyncing
  return (
    <button
      type="button"
      onClick={tappable ? () => sync() : undefined}
      disabled={!tappable}
      className="w-full px-4 py-2.5 text-sm font-semibold text-center min-h-0"
      style={{ background: palette.bg, color: palette.fg, cursor: tappable ? 'pointer' : 'default' }}
    >
      {label}
    </button>
  )
}
