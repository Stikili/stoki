'use client'

import { useState, useTransition } from 'react'
import { Store } from '@/domain/entities/store'
import { updateStoreAction, deleteStoreAction } from '@/app/(app)/settings/actions'

const cardStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '16px',
}

const inputStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--card-border)',
  borderRadius: '14px',
  padding: '14px 16px',
  color: 'var(--foreground)',
  fontSize: '16px',
  outline: 'none',
  width: '100%',
} as const

export default function StoreDetailsCard({
  store,
  canDelete,
}: {
  store: Store
  canDelete: boolean
}) {
  const [storeSaved, setStoreSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleUpdateStore(formData: FormData) {
    startTransition(async () => {
      await updateStoreAction(formData)
      setStoreSaved(true)
      setTimeout(() => setStoreSaved(false), 3000)
    })
  }

  function handleDeleteStore() {
    if (!confirm(`Delete "${store.name}"? This cannot be undone.`)) return
    startTransition(() => deleteStoreAction(store.id))
  }

  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Store details</p>
      <p className="text-muted text-sm mb-4">Update your store name, phone, address, and WhatsApp number.</p>
      {storeSaved && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-semibold mb-3"
          style={{ background: '#143328', color: '#00C896', border: '1px solid #1E4D3F' }}
        >
          ✓ Store updated
        </div>
      )}
      <form action={handleUpdateStore} className="flex flex-col gap-3">
        <input name="name" defaultValue={store.name} placeholder="Store name *" required style={inputStyle} />
        <input name="phone" type="tel" defaultValue={store.phone ?? ''} placeholder="Store phone (optional)" style={inputStyle} />
        <div>
          <input name="location" defaultValue={store.location ?? ''} placeholder="Area / suburb (e.g. Soweto, Khayelitsha)" style={inputStyle} />
          <p className="text-muted text-xs mt-1.5 ml-1">
            Helps stoki give you market-relevant advice for your area
          </p>
        </div>
        <div>
          <input name="whatsappNumber" type="tel" defaultValue={store.whatsappNumber ?? ''} placeholder="Your WhatsApp number (e.g. 0821234567)" style={inputStyle} />
          <p className="text-muted text-xs mt-1.5 ml-1">
            Link your number to use the stoki WhatsApp bot — send &quot;help&quot; to get started
          </p>
        </div>
        <textarea name="businessAddress" defaultValue={store.businessAddress ?? ''} placeholder="Business address (printed on tax invoices)" rows={2} style={inputStyle} />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl py-3 font-semibold text-sm"
          style={{ background: '#00C896', color: '#080f1a', opacity: isPending ? 0.6 : 1 }}
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {canDelete && (
        <button
          onClick={handleDeleteStore}
          disabled={isPending}
          className="w-full mt-3 rounded-xl py-3 font-semibold text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', opacity: isPending ? 0.5 : 1 }}
        >
          Delete this store
        </button>
      )}
    </div>
  )
}
