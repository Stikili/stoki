'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { ProductWithStatus } from '@/domain/entities/product'
import { uploadAirtimePinsAction, type UploadPinsResult } from './actions'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import { Upload, Smartphone } from 'lucide-react'

const SAMPLE_CSV = `pin,serial,expires_at
1234567890,SER001,2027-12-31
9876543210,SER002,2027-12-31
`

export default function AirtimeClient({
  products,
  availableCounts,
}: {
  products: ProductWithStatus[]
  availableCounts: Record<string, number>
}) {
  const { toast } = useToast()
  const [uploadFor, setUploadFor] = useState<ProductWithStatus | null>(null)
  const [isPending, startTransition] = useTransition()

  function downloadSampleCsv() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'stoki-airtime-pins-template.csv'
    a.click()
  }

  function handleUpload(productId: string, csv: string, onResult: (r: UploadPinsResult) => void) {
    startTransition(async () => {
      try {
        const result = await uploadAirtimePinsAction(productId, csv)
        haptic(50)
        if (result.inserted > 0) {
          toast(`Loaded ${result.inserted} PIN${result.inserted === 1 ? '' : 's'}${result.skipped ? `, ${result.skipped} skipped` : ''}`)
        } else if (result.errors.length > 0) {
          toast(result.errors[0].message, 'error')
        }
        onResult(result)
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Upload failed', 'error')
      }
    })
  }

  return (
    <>
      <h1 className="text-xl font-bold text-white mb-2">Airtime vouchers</h1>
      <p className="text-muted text-sm mb-4">
        Load PINs from your distributor here. The cashier dispenses one per sale on /sales.
      </p>

      {products.length === 0 ? (
        <div className="card p-5 text-center">
          <Smartphone size={32} color="#7B8CA1" strokeWidth={1.5} className="mx-auto mb-3" />
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>No airtime products yet</p>
          <p className="text-muted text-xs mb-4">
            On <Link href="/inventory" className="text-brand">/inventory</Link>, add a product (e.g. &ldquo;Vodacom R10&rdquo;) and tick the
            &ldquo;Airtime&rdquo; checkbox in its edit form.
          </p>
          <button
            onClick={downloadSampleCsv}
            className="text-brand text-sm font-semibold inline-flex items-center gap-1"
          >
            ↓ Download PIN template CSV
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => {
            const count = availableCounts[p.id] ?? 0
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{p.name}</p>
                    <p className="text-muted text-xs mt-0.5">R{p.price.toFixed(2)} per voucher</p>
                  </div>
                  <span className={`pill ${count > 10 ? 'pill-green' : count > 0 ? 'pill-yellow' : 'pill-red'} ml-2`}>
                    {count} left
                  </span>
                </div>
                <button
                  onClick={() => setUploadFor(p)}
                  className="text-xs font-semibold px-3 py-2 rounded-lg w-full mt-2"
                  style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--foreground)' }}
                >
                  <Upload size={12} className="inline mr-1.5" />
                  Load PINs
                </button>
              </div>
            )
          })}
        </div>
      )}

      {uploadFor && (
        <UploadSheet
          product={uploadFor}
          isPending={isPending}
          onClose={() => setUploadFor(null)}
          onUpload={(csv, done) => handleUpload(uploadFor.id, csv, done)}
          onDownloadSample={downloadSampleCsv}
        />
      )}
    </>
  )
}

function UploadSheet({
  product,
  isPending,
  onClose,
  onUpload,
  onDownloadSample,
}: {
  product: ProductWithStatus
  isPending: boolean
  onClose: () => void
  onUpload: (csv: string, onResult: (r: UploadPinsResult) => void) => void
  onDownloadSample: () => void
}) {
  const [csvText, setCsvText] = useState('')
  const [result, setResult] = useState<UploadPinsResult | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCsvText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative rounded-t-3xl p-6 pb-24 sheet max-h-[88vh] overflow-y-auto">
        <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mb-6" />
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>Load PINs</h2>
        <p className="text-muted text-sm mb-4">{product.name}</p>

        <button onClick={onDownloadSample} className="text-brand text-sm font-semibold mb-3">↓ Download template CSV</button>

        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block w-full text-sm mb-3 text-muted"
        />

        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder="…or paste CSV content here"
          rows={6}
          className="input font-mono text-xs"
        />

        {result && (
          <div className="card p-3 mt-3" style={result.errors.length > 0 ? { borderColor: 'rgba(245,158,11,0.3)' } : {}}>
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>
              ✓ {result.inserted} PIN{result.inserted === 1 ? '' : 's'} loaded{result.skipped ? `, ${result.skipped} failed` : ''}
            </p>
            {result.errors.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer text-muted">{result.errors.length} parse error{result.errors.length === 1 ? '' : 's'}</summary>
                <ul className="text-xs text-danger mt-2 space-y-0.5">
                  {result.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>Line {e.line}: {e.message}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <button
          onClick={() => csvText.trim() && onUpload(csvText, (r) => {
            setResult(r)
            if (r.inserted > 0 && r.errors.length === 0) {
              setCsvText('')
              setTimeout(onClose, 600)
            }
          })}
          disabled={isPending || !csvText.trim()}
          className="btn-primary mt-4"
          style={{ opacity: isPending || !csvText.trim() ? 0.5 : 1 }}
        >
          {isPending ? 'Loading…' : 'Load PINs'}
        </button>
      </div>
    </div>
  )
}
