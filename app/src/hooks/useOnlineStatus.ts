'use client'

import { useSyncExternalStore } from 'react'

// `useSyncExternalStore` is the React-19-correct way to read browser-only state
// without falling foul of the set-state-in-effect rule. SSR snapshot is `true`
// (default to optimistic-online so the offline banner doesn't flash on first paint).

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

function getSnapshot(): boolean {
  return navigator.onLine
}

function getServerSnapshot(): boolean {
  return true
}

export function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { isOnline }
}
