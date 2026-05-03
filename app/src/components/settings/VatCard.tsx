'use client'

import { useState, useTransition } from 'react'
import { Store } from '@/domain/entities/store'
import { updateVatAction, setAllProductsVatInclusiveAction } from '@/app/(app)/settings/actions'

const fieldStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--card-border)',
  borderRadius: '14px',
  padding: '14px 16px',
  color: 'var(--foreground)',
  fontSize: '16px',
  outline: 'none',
  width: '100%',
} as const

export default function VatCard({ store }: { store: Store }) {
  const [vatOn, setVatOn] = useState(store.vatRegistered)
  const [saved, setSaved] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      await updateVatAction(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  function applyBulkVat(inclusive: boolean) {
    const label = inclusive ? 'including VAT' : 'excluding VAT'
    if (!confirm(`Mark every existing product as priced ${label}?\nUse this when first turning VAT on so legacy prices are interpreted correctly.`)) return
    startTransition(async () => {
      const { updated } = await setAllProductsVatInclusiveAction(inclusive)
      setBulkMessage(`Updated ${updated} product${updated === 1 ? '' : 's'} → ${label}.`)
      setTimeout(() => setBulkMessage(null), 5000)
    })
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>VAT &amp; Tax Invoices</p>
      <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
        Toggle on if your business is VAT-registered. Receipts then become SARS-compliant tax invoices with sequential numbering and a VAT breakdown.
      </p>
      {saved && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold mb-3" style={{ background: '#143328', color: '#00C896', border: '1px solid #1E4D3F' }}>
          ✓ VAT settings updated
        </div>
      )}
      <form action={handleSubmit} className="flex flex-col gap-3">
        <label className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 cursor-pointer" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>I am VAT-registered</span>
          <input
            type="checkbox"
            name="vatRegistered"
            checked={vatOn}
            onChange={(e) => setVatOn(e.target.checked)}
            className="w-5 h-5 accent-brand"
          />
        </label>
        {vatOn && (
          <>
            <input
              name="vatNumber"
              defaultValue={store.vatNumber ?? ''}
              placeholder="VAT number (e.g. 4123456789)"
              required
              style={fieldStyle}
            />
            <div>
              <input
                name="vatRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={store.vatRate ?? 15}
                style={fieldStyle}
              />
              <p className="text-muted text-xs mt-1.5 ml-1">VAT rate (%) — SA standard is 15.00</p>
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl py-3 font-semibold text-sm"
          style={{ background: '#00C896', color: '#080f1a', opacity: isPending ? 0.6 : 1 }}
        >
          {isPending ? 'Saving…' : 'Save VAT settings'}
        </button>
      </form>

      {vatOn && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
            Existing products
          </p>
          <p className="text-muted text-xs mb-3">
            Were the prices on your existing products set including VAT, or excluding? Set this once so VAT is calculated correctly.
          </p>
          {bulkMessage && (
            <div className="rounded-xl px-4 py-2 text-xs font-semibold mb-3" style={{ background: '#143328', color: '#00C896', border: '1px solid #1E4D3F' }}>
              ✓ {bulkMessage}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => applyBulkVat(true)}
              disabled={isPending}
              className="rounded-xl py-2.5 text-xs font-semibold"
              style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}
            >
              All include VAT
            </button>
            <button
              type="button"
              onClick={() => applyBulkVat(false)}
              disabled={isPending}
              className="rounded-xl py-2.5 text-xs font-semibold"
              style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }}
            >
              All exclude VAT
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
