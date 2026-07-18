'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Full-screen barcode scanner overlay. Wraps `html5-qrcode` with:
 *   - dynamic import (keeps the scanner library out of the base bundle)
 *   - rear camera preference (`facingMode: 'environment'`)
 *   - barcode-shaped scan box (280×120 rather than a square QR box)
 *   - manual entry fallback for shops without a working camera
 *
 * Auto-stops the scanner the moment a code is detected OR the manual
 * entry is submitted — the caller's `onScan` handler runs exactly once
 * per open.
 *
 * Shared between inventory (look up / edit a product by barcode) and
 * the sales till (scan a barcode → drop the product into the cart).
 * Customise the copy via `title` / `hint` when the calling context
 * needs different words.
 */
export default function BarcodeScanner({
  onScan,
  onClose,
  title = 'Scan barcode',
  hint = 'Point camera at any barcode',
  manualLabel = 'Or type SKU',
}: {
  onScan: (code: string) => void
  onClose: () => void
  title?: string
  hint?: string
  manualLabel?: string
}) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const scannerInstance = useRef<import('html5-qrcode').Html5Qrcode | null>(null)
  const [manualSku, setManualSku] = useState('')

  useEffect(() => {
    let mounted = true

    async function start() {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (!mounted || !scannerRef.current) return

      const scanner = new Html5Qrcode('barcode-reader')
      scannerInstance.current = scanner

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 120 }, aspectRatio: 1.0 },
          (text) => {
            scanner.stop().catch(() => {})
            onScan(text)
          },
          () => {} // ignore per-frame decode errors
        )
      } catch {
        // Camera unavailable or permission denied — silently fall back to
        // manual entry. No error UI here; the manual input below is the
        // affordance.
      }
    }

    start()

    return () => {
      mounted = false
      scannerInstance.current?.stop().catch(() => {})
    }
    // onScan is intentionally excluded — this effect must run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function submitManual() {
    const code = manualSku.trim()
    if (!code) return
    scannerInstance.current?.stop().catch(() => {})
    onScan(code)
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: 'var(--background)' }}>
      <div className="flex items-center justify-between p-4">
        <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>{title}</h2>
        <button
          onClick={onClose}
          className="text-2xl w-10 h-10 flex items-center justify-center"
          style={{ color: 'var(--foreground)' }}
          aria-label="Close scanner"
        >
          ×
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div id="barcode-reader" ref={scannerRef} className="w-full max-w-sm rounded-2xl overflow-hidden" />
        <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>{hint}</p>

        <div className="w-full max-w-sm mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>{manualLabel}</p>
          <div className="flex gap-2">
            <input
              value={manualSku}
              onChange={e => setManualSku(e.target.value)}
              placeholder="Enter barcode / SKU"
              className="input flex-1"
              onKeyDown={e => { if (e.key === 'Enter') submitManual() }}
            />
            <button
              onClick={submitManual}
              disabled={!manualSku.trim()}
              className="btn-primary"
              style={{ width: 'auto', padding: '14px 20px', opacity: manualSku.trim() ? 1 : 0.5 }}
            >
              Go
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
