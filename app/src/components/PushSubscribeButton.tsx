'use client'

import { useState, useEffect } from 'react'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export default function PushSubscribeButton({ storeId }: { storeId: string }) {
  const [state, setState] = useState<'idle' | 'subscribed' | 'denied' | 'unsupported'>('idle')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'denied') setState('denied')
    else if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setState('subscribed')
        })
      )
    }
  }, [])

  async function subscribe() {
    if (loading) return
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState('denied'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), storeId }),
      })

      setState('subscribed')
    } catch {
      // Permission dismissed or error
    } finally {
      setLoading(false)
    }
  }

  if (state === 'unsupported') return null

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white text-sm font-semibold">
          {state === 'subscribed' ? 'Notifications on' : 'Push notifications'}
        </p>
        <p className="text-muted text-xs mt-0.5">
          {state === 'subscribed' ? 'You\'ll get alerts for low stock & debts' :
           state === 'denied' ? 'Blocked in browser settings' :
           'Get alerts for low stock and overdue debts'}
        </p>
      </div>
      {state !== 'denied' && (
        <button
          onClick={state === 'subscribed' ? undefined : subscribe}
          disabled={loading || state === 'subscribed'}
          className="text-xs font-semibold px-4 py-2 rounded-xl flex-shrink-0 ml-3"
          style={state === 'subscribed'
            ? { background: 'rgba(0,200,150,0.12)', color: '#00C896', border: '1px solid rgba(0,200,150,0.2)' }
            : { background: 'linear-gradient(135deg, #00C896, #00a87e)', color: '#080f1a', opacity: loading ? 0.6 : 1 }
          }
        >
          {state === 'subscribed' ? '✓ Enabled' : loading ? 'Enabling…' : 'Enable'}
        </button>
      )}
    </div>
  )
}
