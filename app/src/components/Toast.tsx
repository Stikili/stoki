'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200)
  }, [])

  const typeStyle: Record<ToastType, React.CSSProperties> = {
    success: { background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.35)', color: '#00C896' },
    error:   { background: 'rgba(239,68,68,0.15)',  border: '1px solid rgba(239,68,68,0.35)',  color: '#ef4444' },
    info:    { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', color: '#60a5fa' },
  }

  const icon: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[calc(100%-32px)] max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold animate-toast-in"
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
            <span style={{ color: 'white' }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
