'use client'

import { useState, useEffect } from 'react'
import { encodeTestPrint } from '@/lib/escpos'
import { isPrinterSupported, printBytes } from '@/lib/bluetooth-printer'
import { Printer, CheckCircle, AlertCircle } from 'lucide-react'

type TestState = 'idle' | 'printing' | 'success' | 'error'

export default function PrinterSettingsClient({ storeName }: { storeName: string }) {
  const [supported, setSupported] = useState(false)
  const [testState, setTestState] = useState<TestState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setSupported(isPrinterSupported())
  }, [])

  async function runTestPrint() {
    if (testState === 'printing') return
    setTestState('printing')
    setErrorMsg(null)
    try {
      const dateLabel = new Date().toLocaleString('en-ZA', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
      const bytes = encodeTestPrint(storeName, dateLabel)
      await printBytes(bytes)
      setTestState('success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Print failed'
      // User cancellation — don't surface as an error
      if (/cancel/i.test(msg)) {
        setTestState('idle')
        return
      }
      setErrorMsg(msg)
      setTestState('error')
    }
  }

  if (!supported) {
    return (
      <div className="card p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Printer size={16} color="#7B8CA1" />
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Bluetooth Printer</p>
        </div>
        <p className="text-muted text-sm">
          Bluetooth printing requires Chrome or Edge on desktop or Android.
          It is not supported in this browser.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Printer size={16} color="#7B8CA1" />
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Bluetooth Printer</p>
      </div>

      <p className="text-muted text-sm">
        Send a short test page to verify your ESC/POS printer is connected and working.
        The browser will show a device chooser if no printer is paired yet.
      </p>

      <button
        onClick={runTestPrint}
        disabled={testState === 'printing'}
        className="btn-primary w-full text-sm"
        style={{ opacity: testState === 'printing' ? 0.6 : 1 }}
      >
        <Printer size={14} className="inline mr-1.5" />
        {testState === 'printing' ? 'Connecting…' : 'Test print'}
      </button>

      {testState === 'success' && (
        <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.3)' }}>
          <CheckCircle size={16} className="flex-shrink-0 mt-0.5" color="#00C896" />
          <p className="text-sm" style={{ color: '#00C896' }}>Test page sent successfully.</p>
        </div>
      )}

      {testState === 'error' && errorMsg && (
        <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" color="#EF4444" />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>Print failed</p>
            <p className="text-xs mt-0.5 text-muted">{errorMsg}</p>
          </div>
        </div>
      )}
    </div>
  )
}
