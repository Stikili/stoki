'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; type: ToastType; onUndo?: () => void }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void; toastUndo: (message: string, onUndo: () => void) => void }

const ToastContext = createContext<ToastContextValue>({ toast: () => {}, toastUndo: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)
  const dismiss = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), [])
  const toast = useCallback((msg: string, type: ToastType = 'success') => { const id = ++counter.current; setToasts(prev => [...prev, { id, message: msg, type }]); setTimeout(() => dismiss(id), 3200) }, [dismiss])
  const toastUndo = useCallback((msg: string, onUndo: () => void) => { const id = ++counter.current; setToasts(prev => [...prev, { id, message: msg, type: 'info', onUndo }]); setTimeout(() => dismiss(id), 5000) }, [dismiss])

  const bgVar: Record<ToastType, string> = { success: 'var(--toast-success-bg)', error: 'var(--toast-error-bg)', info: 'var(--toast-info-bg)' }
  const borderVar: Record<ToastType, string> = { success: 'var(--toast-success-border)', error: 'var(--toast-error-border)', info: 'var(--toast-info-border)' }
  const color: Record<ToastType, string> = { success: '#00C896', error: '#EF4444', info: '#3B82F6' }
  const icon: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' }

  return (
    <ToastContext.Provider value={{ toast, toastUndo }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[calc(100%-32px)] max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold animate-toast-in pointer-events-auto"
            style={{ background: bgVar[t.type], border: `1px solid ${borderVar[t.type]}` }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: color[t.type], color: 'white', fontWeight: 900 }}>{icon[t.type]}</span>
            <span className="flex-1" style={{ color: 'var(--foreground)' }}>{t.message}</span>
            {t.onUndo && <button onClick={() => { t.onUndo?.(); dismiss(t.id) }} className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 min-h-0" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>Undo</button>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() { return useContext(ToastContext) }
