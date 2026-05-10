'use client'

import { useState, useTransition } from 'react'
import { Store } from '@/domain/entities/store'
import { updateStoreAction, deleteStoreAction } from '@/app/(app)/settings/actions'
import { MapPin, LocateFixed, Wallet } from 'lucide-react'

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
  // Track GPS in local state so the "Use my location" button can update the
  // hidden form inputs without a full re-render of the saved store record.
  const [lat, setLat] = useState<string>(store.lat != null ? String(store.lat) : '')
  const [lng, setLng] = useState<string>(store.lng != null ? String(store.lng) : '')
  const [gpsBusy, setGpsBusy] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  function captureGps() {
    setGpsError(null)
    if (!navigator.geolocation) {
      setGpsError('This browser does not support geolocation. Enter coordinates manually.')
      return
    }
    setGpsBusy(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setGpsBusy(false)
      },
      err => {
        setGpsBusy(false)
        // err.code 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
        const msg = err.code === 1
          ? 'Location permission denied. Enable it in your browser, or enter coordinates manually below.'
          : err.code === 2
            ? "We couldn't get your location. Try outside or near a window, or enter coordinates manually."
            : 'Location request timed out. Try again, or enter coordinates manually.'
        setGpsError(msg)
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }

  function clearGps() {
    setLat(''); setLng(''); setGpsError(null)
  }

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

        {/* GPS — feeds weather + competitor-proximity push features.
            Browser geolocation prompts on first use; falls back to manual
            lat/lng inputs if the user declines or the API is unavailable. */}
        <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <MapPin size={14} style={{ color: 'var(--muted)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Shop location</p>
          </div>
          <p className="text-muted text-xs mb-3">
            Powers weather alerts and the new-competitor-nearby alert. We never share your location with anyone — it stays in your store record.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={captureGps}
              disabled={gpsBusy}
              className="rounded-xl py-2.5 px-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)', opacity: gpsBusy ? 0.6 : 1 }}
            >
              <LocateFixed size={14} />
              {gpsBusy ? 'Getting your location…' : (lat && lng ? 'Update GPS' : 'Use my location')}
            </button>

            {/* Lat/Lng visible-but-readonly when set, editable when manual.
                Keeps the value in the form payload without a separate hidden
                input, so manual edits flow through with no extra wiring. */}
            <div className="grid grid-cols-2 gap-2">
              <input
                name="lat" inputMode="decimal" placeholder="Latitude"
                value={lat} onChange={e => setLat(e.target.value)}
                style={{ ...inputStyle, padding: '10px 12px', fontSize: '13px' }}
              />
              <input
                name="lng" inputMode="decimal" placeholder="Longitude"
                value={lng} onChange={e => setLng(e.target.value)}
                style={{ ...inputStyle, padding: '10px 12px', fontSize: '13px' }}
              />
            </div>
            {(lat || lng) && (
              <button
                type="button" onClick={clearGps}
                className="text-muted text-xs underline self-start"
              >
                Clear location
              </button>
            )}
            {gpsError && (
              <p className="text-xs" style={{ color: '#ef4444' }}>{gpsError}</p>
            )}
          </div>
        </div>

        {/* Cash balance — feeds working-capital-gap. Updated manually; we
            don't link to a bank API. Empty = "not tracked", 0 = "no cash". */}
        <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Wallet size={14} style={{ color: 'var(--muted)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Cash on hand (float)</p>
          </div>
          <p className="text-muted text-xs mb-3">
            Roughly how much cash do you have available for restocking? Stoki uses this near month-end to suggest a budget-fit reorder list. Leave blank if you&apos;d rather not track it.
          </p>
          <input
            name="cashBalance"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            defaultValue={store.cashBalance != null ? String(store.cashBalance) : ''}
            placeholder="e.g. 1500.00"
            style={{ ...inputStyle, padding: '10px 12px', fontSize: '14px' }}
          />
          {store.cashBalanceUpdatedAt && (
            <p className="text-muted text-[11px] mt-1.5 ml-1">
              Last updated {new Date(store.cashBalanceUpdatedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

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
