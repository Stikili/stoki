'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  onUndo?: () => void
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  toastUndo: (message: string, onUndo: () => void) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {}, toastUndo: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), 3200)
  }, [dismiss])

  const toastUndo = useCallback((message: string, onUndo: () => void) => {
    const id = ++counter.current
    setToasts((prev) => [...prev, { id, message, type: 'info', onUndo }])
    setTimeout(() => dismiss(id), 5000)
  }, [dismiss])

  const typeStyle: Record<ToastType, React.CSSProperties> = {
    success: { background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.35)', color: '#00C896' },
    error:   { background: 'rgba(239,68,68,0.15)',  border: '1px solid rgba(239,68,68,0.35)',  color: '#ef4444' },
    info:    { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', color: '#60a5fa' },
  }

  const icon: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' }

  return (
    <ToastContext.Provider value={{ toast, toastUndo }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[calc(100%-32px)] max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold animate-toast-in pointer-events-auto"
            style={{
              ...typeStyle[t.type],
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.1) inset',
            }}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
              style={{ background: 'currentColor', color: 'rgba(8,18,32,0.9)', fontWeight: 900 }}>
              {icon[t.type]}
            </span>
            <span className="flex-1" style={{ color: 'white' }}>{t.message}</span>
            {t.onUndo && (
              <button
                onClick={() => { t.onUndo?.(); dismiss(t.id) }}
                className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 min-h-0"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
